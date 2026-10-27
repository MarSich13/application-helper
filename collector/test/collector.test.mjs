import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { normalize, workplace, batches, requiredUnsupportedLanguage } from '../lib/normalize.mjs';
import { CrmClient } from '../lib/crm.mjs';

const vacancy = (overrides = {}) => ({ id: '12345', title: 'Software Developer', company: 'Example', location: 'Tallinn, Estonia', description: 'Requirements: Java, Spring Boot, PostgreSQL and C#. Fluent English. Hybrid work.', ...overrides });

test('normalization uses a stable LinkedIn identity and canonical URL without creating personal actions', () => {
  const { item } = normalize(vacancy({ url: 'https://untrusted.invalid/tracking' }));
  assert.equal(item.externalId, '12345');
  assert.equal(item.sourceUrl, 'https://www.linkedin.com/jobs/view/12345');
  assert.equal(item.workMode, 'HYBRID');
  assert.deepEqual(item.technologies, ['java', 'c#', 'spring boot', 'spring', 'postgresql', 'sql']);
  assert.equal(item.status, undefined); assert.equal(item.notes, undefined);
});

test('location filtering admits Tallinn and Estonia remote, and rejects other cities and generic worldwide remote', () => {
  assert.doesNotThrow(() => normalize(vacancy({ location: 'Tallinn Metropolitan Area' })));
  assert.doesNotThrow(() => normalize(vacancy({ location: 'Estonia', workplaceType: 'remote' })));
  assert.throws(() => normalize(vacancy({ location: 'Tartu, Estonia' })), /Outside Tallinn/);
  assert.throws(() => normalize(vacancy({ location: 'Worldwide', workplaceType: 'remote' })), /Outside Tallinn/);
});

test('required unsupported languages are excluded while optional language skills remain eligible', () => {
  assert.equal(requiredUnsupportedLanguage('Fluent in English and German required.'), 'German');
  assert.equal(requiredUnsupportedLanguage('German is mandatory.'), 'German');
  assert.equal(requiredUnsupportedLanguage('Fluent in English. German is a plus.'), undefined);
  assert.equal(requiredUnsupportedLanguage('Fluent in English and Estonian.'), undefined);
  assert.throws(() => normalize(vacancy({ description: 'Java. German is required.' })), /German/);
});

test('uncertain and multiple work arrangements do not become invented remote-only roles', () => {
  assert.equal(workplace('Hübriidtöö', 'unknown'), 'HYBRID');
  assert.equal(workplace('Office-based/hybrid/remote opportunities', 'remote'), 'UNSPECIFIED');
  assert.equal(workplace('Maintain remote systems', 'unknown'), 'UNSPECIFIED');
});

test('requirements extraction ignores company history and retains seniority without hard filtering', () => {
  const { item } = normalize(vacancy({ title: 'Senior Developer', seniorityLevel: 'Mid-Senior level', description: 'Company with 30 years of experience. Qualifications: C#, .NET 8, SQL. Fluent English.' }));
  assert.equal(item.experience, 'Mid-Senior level');
  assert.equal(normalize(vacancy({ description: 'Who Are We Looking ForAt least 2 years of professional experience. Java.' })).item.experience, 'At least 2 years');
});

test('junior roles remain discoverable by the CRM experience filter when LinkedIn seniority is missing', () => {
  assert.equal(normalize(vacancy({ title: 'Junior Software Developer at CODE Tribe', seniorityLevel: 'Not Applicable' })).item.experience, 'Junior');
  assert.equal(normalize(vacancy({ title: 'QA Engineer', seniorityLevel: 'Entry level' })).item.experience, 'Junior');
});

test('malformed, incomplete, and explicitly closed postings are rejected', () => {
  assert.throws(() => normalize(vacancy({ id: '../../file' })), /invalid LinkedIn/);
  assert.throws(() => normalize(vacancy({ description: '' })), /Incomplete/);
  assert.throws(() => normalize(vacancy({ description: 'This job is no longer available' })), /closed/);
});

test('batching respects byte limits for Unicode, never sends an empty batch, and preserves identity', () => {
  const first = normalize(vacancy({ description: 'Requirements: Java. Eesti, Таллинн.' })).item;
  const second = { ...first, externalId: '12346' };
  const max = Buffer.byteLength(JSON.stringify({ source: 'linkedin', vacancies: [first] })) + 5;
  const result = batches([first, second], max);
  assert.equal(result.length, 2);
  assert.ok(result.every(batch => batch.source === 'linkedin' && Buffer.byteLength(JSON.stringify(batch)) <= max));
  assert.deepEqual(result.flatMap(batch => batch.vacancies).map(item => item.externalId), ['12345', '12346']);
  assert.deepEqual(batches([]), []);
  assert.throws(() => batches([first], 10), /byte limit/);
});

test('CRM client keeps session and rotated CSRF tokens, confirms import, and does not send credentials to import', async t => {
  let loggedIn = false;
  const server = createServer(async (request, response) => {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const content = Buffer.concat(chunks).toString();
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/api/auth/csrf') {
      response.setHeader('Set-Cookie', `JSESSIONID=${loggedIn ? 'rotated' : 'initial'}; HttpOnly; Path=/`);
      response.end(JSON.stringify({ headerName: 'X-CSRF-TOKEN', token: loggedIn ? 'after-login' : 'before-login' })); return;
    }
    if (request.url === '/api/auth/login') {
      assert.equal(request.headers['x-csrf-token'], 'before-login');
      assert.equal(request.headers.cookie, 'JSESSIONID=initial');
      assert.equal(new URLSearchParams(content).get('password'), 'local-secret');
      loggedIn = true; response.setHeader('Set-Cookie', 'JSESSIONID=rotated; HttpOnly; Path=/'); response.writeHead(204).end(); return;
    }
    if (request.url === '/api/auth/me') { assert.equal(request.headers.cookie, 'JSESSIONID=rotated'); response.end('{"id":1}'); return; }
    if (request.url === '/api/imports') {
      assert.equal(request.headers['x-csrf-token'], 'after-login'); assert.equal(request.headers.cookie, 'JSESSIONID=rotated');
      assert.ok(!content.includes('local-secret'));
      const payload = JSON.parse(content); assert.equal(payload.source, 'linkedin');
      response.end(JSON.stringify({ created: 1, updated: 0, processed: payload.vacancies.length, vacancyIds: [9] })); return;
    }
    response.writeHead(404).end('{}');
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => server.close());
  const crm = new CrmClient(`http://127.0.0.1:${server.address().port}`, 'collector@example.test', 'local-secret');
  await crm.login();
  assert.equal((await crm.import({ source: 'linkedin', vacancies: [normalize(vacancy()).item] })).created, 1);
  await assert.rejects(crm.import({ source: 'manual', vacancies: [] }), /Invalid LinkedIn/);
});

test('CRM client refuses unsafe origins and does not treat a partial acknowledgement as delivery', async t => {
  assert.throws(() => new CrmClient('http://example.com', 'x', 'y'), /HTTPS/);
  assert.throws(() => new CrmClient('https://user:password@example.com', 'x', 'y'), /origin/);
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(request.url === '/api/auth/csrf' ? '{"headerName":"X-CSRF-TOKEN","token":"token"}' : '{"created":0,"updated":0,"processed":0,"vacancyIds":[]}');
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening'); t.after(() => server.close());
  const crm = new CrmClient(`http://127.0.0.1:${server.address().port}`, 'x', 'y');
  await assert.rejects(crm.import({ source: 'linkedin', vacancies: [normalize(vacancy()).item] }), /confirm the complete import/);
});
