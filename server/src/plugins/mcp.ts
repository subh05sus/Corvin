import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import { validateAuthKey } from "../utils/auth";
import { buildMcpServer } from "../services/mcp-server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

interface McpSession {
  mcp: McpServer;
  transport: StreamableHTTPServerTransport;
}

const sessions = new Map<string, McpSession>();

const mcpPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.all("/v2/mcp", async (req, reply) => {
    const authHeader = (req.headers as Record<string, string>)["authorization"] ?? "";
    const bearerKey = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!bearerKey) {
      return reply.code(401).send({ error: "Missing Authorization: Bearer <api-key> header." });
    }

    const session = await validateAuthKey(bearerKey);
    if (!session) {
      return reply.code(401).send({ error: "Invalid or revoked API key. Run `corvin login` to obtain one." });
    }

    const sessionId = (req.headers as Record<string, string>)["mcp-session-id"] ?? undefined;

    if (sessionId && sessions.has(sessionId)) {
      const existing = sessions.get(sessionId)!;
      reply.hijack();
      try {
        await existing.transport.handleRequest(req.raw, reply.raw, req.body);
      } catch (err) {
        fastify.log.error({ err }, "[mcp] Error handling request on existing session");
        if (!reply.raw.headersSent) {
          reply.raw.writeHead(500, { "Content-Type": "application/json" });
          reply.raw.end(JSON.stringify({ error: "Internal error" }));
        }
      }
      return;
    }

    // New session
    const newSessionId = randomUUID();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
    });

    const mcp = buildMcpServer(session.userId, session.ai);
    await mcp.connect(transport as unknown as Transport);
    sessions.set(newSessionId, { mcp, transport });

    transport.onclose = () => {
      sessions.delete(newSessionId);
    };

    reply.hijack();
    try {
      await transport.handleRequest(req.raw, reply.raw, req.body);
    } catch (err) {
      fastify.log.error({ err }, "[mcp] Error handling new session request");
      sessions.delete(newSessionId);
      if (!reply.raw.headersSent) {
        reply.raw.writeHead(500, { "Content-Type": "application/json" });
        reply.raw.end(JSON.stringify({ error: "Internal error" }));
      }
    }
  });
};

export default fp(mcpPlugin, { name: "mcp" });
