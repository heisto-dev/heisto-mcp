import type { FastifyInstance } from 'fastify';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createHeistoMcpServer } from './server.js';
import type { PublicMcpReader } from './public-reader.js';
import manifest from './server.json' with { type: 'json' };

// Public ownership proof only. The signing material is never loaded by this server.
export const REGISTRY_PUBLIC_PROOF = 'v=MCPv1; k=ed25519; p=rbQM0QInG2SiNTP1vDiXXalTz8UaENTVpK2cPgfTF2Y=';

export async function registerHeistoMcp(
  app: FastifyInstance, reader: PublicMcpReader, additionalHosts: string[] = [],
) {
  app.get('/.well-known/mcp-registry-auth', async (_request, reply) =>
    reply.type('text/plain; charset=utf-8').header('Cache-Control', 'no-store').send(REGISTRY_PUBLIC_PROOF + '\n'));
  app.get('/mcp/server.json', async (_request, reply) => reply.header('Cache-Control', 'no-store').send(manifest));
  app.route({
    method: ['GET', 'DELETE'], url: '/mcp',
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    handler: async (_request, reply) => reply.code(405).header('Allow', 'POST, OPTIONS').send({
      jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Use POST for stateless MCP. https://heisto.xyz' },
    }),
  });
  app.post('/mcp', {
    bodyLimit: 24 * 1024,
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const host = request.headers.host ?? '';
    const allowedHostnames = ['heisto.xyz', 'localhost', '127.0.0.1', ...additionalHosts.map(value => value.split(':')[0])];
    if (!/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host) || !allowedHostnames.includes(host.split(':')[0].toLowerCase())) {
      return reply.code(403).send({
        jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Unrecognized MCP host. https://heisto.xyz' },
      });
    }
    if (Array.isArray(request.body) || !request.body || typeof request.body !== 'object') {
      return reply.code(400).send({
        jsonrpc: '2.0', id: null, error: { code: -32600, message: 'One MCP request is required. https://heisto.xyz' },
      });
    }
    const failed = () => request.log.warn({ event: 'mcp_public_read_failed', requestId: request.id }, 'Public MCP read unavailable');
    const server = createHeistoMcpServer(reader, failed);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, enableJsonResponse: true,
      enableDnsRebindingProtection: true,
      // The official SDK compares exact Host headers; it does not expand wildcards.
      allowedHosts: [host],
    });
    server.server.onerror = () => request.log.warn({ event: 'mcp_protocol_error', requestId: request.id }, 'MCP protocol error');
    await server.connect(transport);
    reply.raw.once('close', () => { void server.close().catch(failed); });
    // Fastify onSend hooks do not run for hijacked replies.
    reply.header('Cache-Control', 'no-store');
    for (const [name, value] of Object.entries(reply.getHeaders())) {
      if (value !== undefined) reply.raw.setHeader(name, value);
    }
    reply.hijack();
    try {
      await transport.handleRequest(request.raw, reply.raw, request.body);
    } catch {
      failed();
      if (!reply.raw.headersSent) {
        reply.raw.writeHead(500, { 'Content-Type': 'application/json' });
        reply.raw.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'MCP temporarily unavailable. https://heisto.xyz' } }));
      } else if (!reply.raw.writableEnded) reply.raw.end();
    }
  });
}
