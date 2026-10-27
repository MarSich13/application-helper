import { mkdir, readFile, writeFile, rename, readdir, unlink, open } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { parseEnv } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { CrmClient } from './lib/crm.mjs';
import { normalize, batches } from './lib/normalize.mjs';
import { connectLinkedIn } from './lib/mcp.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const settingsFile = join(root, 'collector', '.env');
const dataDir = join(root, '.local', 'collector');
const pendingDir = join(dataDir, 'pending');
const command = process.argv[2] ?? 'collect';
if (!['setup', 'collect', 'retry'].includes(command)) throw new Error('Usage: node collector/run.mjs setup|collect|retry');
const profile = JSON.parse(await readFile(join(root, 'collector', 'search-profile.json'), 'utf8'));
let saved = await readFile(settingsFile, 'utf8').then(parseEnv).catch(error => { if (error.code === 'ENOENT') return {}; throw error; });
const config = { ...saved, ...process.env };
const baseUrl = config.CRM_BASE_URL || 'http://127.0.0.1:3000';
await mkdir(pendingDir, { recursive: true });

async function atomicJson(path, value) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  await rename(temporary, path);
}

// wx is atomic across processes. Recover only locks whose owning process is gone.
const lockPath = join(dataDir, 'run.lock');
let lock;
try { lock = await open(lockPath, 'wx'); }
catch (error) {
  if (error.code !== 'EEXIST') throw error;
  const previous = JSON.parse(await readFile(lockPath, 'utf8'));
  try { process.kill(previous.pid, 0); throw new Error('Another collector run is already active'); }
  catch (probe) { if (probe.code !== 'ESRCH') throw probe; }
  await unlink(lockPath);
  lock = await open(lockPath, 'wx');
}
await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
let crm;
try {
  if (command === 'setup') {
    if (!config.CRM_EMAIL && !config.CRM_PASSWORD) {
      saved = { CRM_BASE_URL: baseUrl, CRM_EMAIL: `collector-${randomBytes(5).toString('hex')}@application-helper.local`, CRM_PASSWORD: randomBytes(32).toString('base64url') };
      // Empty example files can be completed, while existing credentials are retained.
      await writeFile(settingsFile, Object.entries(saved).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600 });
      Object.assign(config, saved);
    }
    crm = new CrmClient(baseUrl, config.CRM_EMAIL, config.CRM_PASSWORD);
    try { await crm.login(); }
    catch (error) {
      if (error.status !== 401) throw error;
      await crm.register(); await crm.login();
    }
    console.log(JSON.stringify({ setup: 'ready', crm: baseUrl, credentialsFile: 'collector/.env', credentialsLogged: false }));
  } else {
    const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomBytes(3).toString('hex');
    const runDir = join(dataDir, 'runs', runId);
    await mkdir(runDir, { recursive: true });
    const report = { runId, startedAt: new Date().toISOString(), timezone: profile.timezone, command, searches: [], found: 0, selected: 0, skipped: [], warnings: [], failures: [], imports: [], created: 0, updated: 0, pending: 0 };
    let client;
    try {
      if (command === 'collect') {
        const raw = { searches: [], details: [] };
        client = await connectLinkedIn();
        const unique = new Map();
        for (const query of profile.queries) {
          const args = { location: profile.location, distance: profile.distance, datePosted: profile.datePosted, sortBy: 'most-recent', limit: profile.limitPerQuery, ...query };
          try {
            const response = await client.call('search_jobs', args);
            if (!Array.isArray(response.jobs)) throw new Error('LinkedIn MCP returned no jobs array');
            raw.searches.push({ arguments: args, response });
            report.searches.push({ keywords: args.keywords, location: args.location, count: response.jobs.length });
            for (const job of response.jobs) if (/^\d+$/.test(String(job.id))) unique.set(String(job.id), job);
          } catch (error) { report.failures.push({ query: args.keywords, error: error.message }); }
          await atomicJson(join(runDir, 'raw.json'), raw);
          await delay(profile.delayMs);
        }
        report.found = unique.size;
        if (unique.size > profile.maxDetails) report.warnings.push(`Detail budget reached: ${profile.maxDetails} of ${unique.size} results`);
        const items = [];
        // Query overlap is collapsed by LinkedIn ID before any detail requests or imports.
        for (const [id] of [...unique].slice(0, profile.maxDetails)) {
          let job;
          try {
            const response = await client.call('get_job_details', { jobId: id });
            job = response.job;
            if (String(job?.id) !== id) throw new Error('LinkedIn MCP returned a different job ID');
            raw.details.push(job);
          } catch (error) { report.failures.push({ id, error: error.message }); await delay(profile.delayMs); continue; }
          try {
            const normalized = normalize(job, profile.acceptedLanguages);
            items.push(normalized.item);
            report.warnings.push(...normalized.warnings.map(message => ({ id, message })));
          } catch (error) { report.skipped.push({ id, reason: error.message }); }
          await atomicJson(join(runDir, 'raw.json'), raw);
          await delay(profile.delayMs);
        }
        await client.close(); client = null;
        report.selected = items.length;
        await atomicJson(join(runDir, 'payload.json'), { source: 'linkedin', vacancies: items });
        for (const [index, payload] of batches(items).entries()) {
          await atomicJson(join(pendingDir, `${runId}.${index}.json`), { runId, payload });
        }
        if (!raw.searches.length) throw new Error('All LinkedIn MCP searches failed');
      }
      const pending = (await readdir(pendingDir)).filter(name => name.endsWith('.json')).sort();
      if (pending.length) {
        crm = new CrmClient(baseUrl, config.CRM_EMAIL, config.CRM_PASSWORD);
        await crm.login();
        for (const file of pending) {
          const envelope = JSON.parse(await readFile(join(pendingDir, file), 'utf8'));
          try {
            const receipt = await crm.import(envelope.payload);
            const confirmed = { batch: file, originatingRun: envelope.runId, confirmedAt: new Date().toISOString(), ...receipt };
            // Persist acknowledgement before removing the durable pending batch.
            await atomicJson(join(dataDir, 'runs', envelope.runId, file.replace('.json', '.receipt.json')), confirmed);
            await unlink(join(pendingDir, file));
            report.imports.push(confirmed); report.created += receipt.created; report.updated += receipt.updated;
          } catch (error) { report.failures.push({ batch: file, error: error.message }); }
        }
      }
    } catch (error) { report.failures.push({ error: error.message }); }
    finally { if (client) await client.close().catch(() => {}); }
    report.pending = (await readdir(pendingDir)).filter(name => name.endsWith('.json')).length;
    report.finishedAt = new Date().toISOString();
    report.status = report.failures.length || report.pending ? 'attention' : 'success';
    await atomicJson(join(runDir, 'report.json'), report);
    await atomicJson(join(dataDir, 'latest-report.json'), report);
    console.log(JSON.stringify({ ...report, reportFile: `.local/collector/runs/${runId}/report.json` }, null, 2));
    if (report.status !== 'success') process.exitCode = 2;
  }
} catch (error) {
  console.error(JSON.stringify({ status: 'failed', error: error.message })); process.exitCode = 2;
} finally {
  if (crm) await crm.close();
  await lock.close(); await unlink(lockPath);
}
