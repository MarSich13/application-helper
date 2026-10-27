import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { createRequire } from 'node:module';

export async function connectLinkedIn() {
  const require = createRequire(import.meta.url);
  const env = Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY']
    .filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
  const transport = new StdioClientTransport({ command: process.execPath, args: [require.resolve('linkedin-mcp-search')], env, stderr: 'pipe' });
  const client = new Client({ name: 'application-helper-collector', version: '1.0.0' });
  try {
    await client.connect(transport);
    transport.stderr?.on('data', () => {});
    const catalog = await client.listTools();
    if (!['search_jobs', 'get_job_details'].every(name => catalog.tools.some(tool => tool.name === name))) throw new Error('LinkedIn MCP is missing job tools');
  } catch (error) { await client.close().catch(() => {}); throw error; }
  return {
    async call(name, args) {
      if (!['search_jobs', 'get_job_details'].includes(name)) throw new Error('Unsupported MCP operation');
      const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 45_000 });
      const text = result.content?.filter(block => block.type === 'text').map(block => block.text).join('\n');
      const parsed = JSON.parse(text || '{}');
      if (result.isError || !parsed.success) throw new Error(`LinkedIn MCP ${name} failed`);
      return parsed;
    },
    close: () => client.close(),
  };
}
