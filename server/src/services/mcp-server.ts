import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { generateText } from "ai";
import { z } from "zod";
import socketManager from "../utils/socketManager";
import { sendAndPoll } from "./tool-bridge";
import { resolveModel, serverFallbackConfig, type ProviderConfig } from "./ai-provider";

function accessDenied(serviceId: string): string {
  return `No access to service "${serviceId}". Only services connected to your Corvin session are accessible.`;
}

export function buildMcpServer(userId: string, aiConfig: ProviderConfig | null): McpServer {
  const mcp = new McpServer({ name: "corvin", version: "1.0.0" });
  const providerCfg = aiConfig ?? serverFallbackConfig();

  mcp.tool(
    "listServices",
    "List all services currently connected to your Corvin local cluster.",
    {},
    async () => {
      const serviceIds = socketManager.getServiceIdsByUser(userId);
      const text =
        serviceIds.length === 0
          ? "No services connected. Start a service with `corvin <cmd>` in its directory."
          : `Connected services (${serviceIds.length}):\n` + serviceIds.map((id) => `- ${id}`).join("\n");
      return { content: [{ type: "text" as const, text }] };
    }
  );

  mcp.tool(
    "tailLogs",
    "Get the last N lines from a service's in-memory logs.",
    { serviceId: z.string(), n: z.number().int().min(1).max(500).default(50) },
    async ({ serviceId, n }) => {
      if (!socketManager.isOwnedByUser(serviceId, userId)) {
        return { content: [{ type: "text" as const, text: accessDenied(serviceId) }] };
      }
      const result = await sendAndPoll(serviceId, "tail_logs", { n });
      return { content: [{ type: "text" as const, text: result }] };
    }
  );

  mcp.tool(
    "grepLogs",
    "Search a service's in-memory logs for a pattern with surrounding context.",
    {
      serviceId: z.string(),
      pattern: z.string(),
      before: z.number().int().min(0).max(20).default(5),
      after: z.number().int().min(0).max(20).default(5),
    },
    async ({ serviceId, pattern, before, after }) => {
      if (!socketManager.isOwnedByUser(serviceId, userId)) {
        return { content: [{ type: "text" as const, text: accessDenied(serviceId) }] };
      }
      const result = await sendAndPoll(serviceId, "grep_logs", { pattern, before, after });
      return { content: [{ type: "text" as const, text: result }] };
    }
  );

  mcp.tool(
    "getRecentErrors",
    "Get the most recent N log lines containing ERROR, WARN, FATAL, or EXCEPTION.",
    { serviceId: z.string(), n: z.number().int().min(1).max(200).default(20) },
    async ({ serviceId, n }) => {
      if (!socketManager.isOwnedByUser(serviceId, userId)) {
        return { content: [{ type: "text" as const, text: accessDenied(serviceId) }] };
      }
      const result = await sendAndPoll(serviceId, "get_recent_errors", { n });
      return { content: [{ type: "text" as const, text: result }] };
    }
  );

  mcp.tool(
    "readLogs",
    "Read a service's logs paginated (50 lines per page). Prefer tailLogs or grepLogs.",
    { serviceId: z.string(), pageNumber: z.number().int().min(1).default(1) },
    async ({ serviceId, pageNumber }) => {
      if (!socketManager.isOwnedByUser(serviceId, userId)) {
        return { content: [{ type: "text" as const, text: accessDenied(serviceId) }] };
      }
      const result = await sendAndPoll(serviceId, "read_logs", { pageNumber, max_results: 20 });
      return { content: [{ type: "text" as const, text: result }] };
    }
  );

  mcp.tool(
    "grepCodeBase",
    "Search a service's codebase for a pattern. Returns matching file paths and lines.",
    { serviceId: z.string(), searchTerm: z.string() },
    async ({ serviceId, searchTerm }) => {
      if (!socketManager.isOwnedByUser(serviceId, userId)) {
        return { content: [{ type: "text" as const, text: accessDenied(serviceId) }] };
      }
      const result = await sendAndPoll(serviceId, "grep_search", { searchTerm, max_results: 20 }, 60000);
      return { content: [{ type: "text" as const, text: result }] };
    }
  );

  mcp.tool(
    "readFileContents",
    "Read lines around a specific line number in a service's source file.",
    {
      serviceId: z.string(),
      filePath: z.string(),
      lineNumber: z.number().int().min(1),
      before: z.number().int().min(0).max(100).default(30),
      after: z.number().int().min(0).max(100).default(30),
    },
    async ({ serviceId, filePath, lineNumber, before, after }) => {
      if (!socketManager.isOwnedByUser(serviceId, userId)) {
        return { content: [{ type: "text" as const, text: accessDenied(serviceId) }] };
      }
      const result = await sendAndPoll(serviceId, "read_file", { filePath, lineNumber, before, after }, 10000);
      return { content: [{ type: "text" as const, text: result }] };
    }
  );

  mcp.tool(
    "generateYamlName",
    "Generate a concise project name (1-2 words) from a plain-language description.",
    { description: z.string(), currentDirectory: z.string().optional() },
    async ({ description, currentDirectory }) => {
      if (!providerCfg) {
        return { content: [{ type: "text" as const, text: "No AI provider configured. Add your API key at /dashboard/ai-keys." }] };
      }
      try {
        const model = resolveModel(providerCfg);
        const resp = await generateText({
          model,
          system: "You are a technical product naming assistant. Respond ONLY with a concise project name (maximum two words). Avoid punctuation, quotes, the word 'project', file extensions, or extra commentary.",
          messages: [{
            role: "user",
            content: `Description: ${description.trim()}\nDirectory context: ${currentDirectory || "Not provided"}\n\nReturn only the project name, nothing else.`,
          }],
          temperature: 0.2,
          maxTokens: 20,
        });
        const name = resp.text?.trim().replace(/[^a-zA-Z0-9\s-]/g, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 2).join(" ");
        return { content: [{ type: "text" as const, text: name || "my-service" }] };
      } catch (err: any) {
        return { content: [{ type: "text" as const, text: `Error: ${err.message}` }] };
      }
    }
  );

  return mcp;
}
