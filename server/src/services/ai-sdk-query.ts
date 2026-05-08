/**
 * AI SDK query service – single-call agent with tools (replaces LangGraph for query path).
 * Uses streamText + tools + maxSteps.
 */

import { streamText, generateText, tool } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import socketManager from "../utils/socketManager";
import redisClient from "../utils/redis";
import { config } from "../config";
import { readFileSync } from "fs";
import path from "path";


/** Max tool-calling steps before stopping (same idea as AI SDK default). */
export const MAX_STEPS = 20;

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Build single system prompt from answerNode style + logs/architecture context. */
export function buildSystemPrompt(options: {
  logs: string;
  architecture: string;
  serviceId: string;
}): string {
  const { logs, architecture, serviceId } = options;
  const original = `You are Corvin, a CLI tool built for debugging across multiple services.
You are a software developer with a skillset of debugging. You are very good at investigation.
You look at problems from multiple angles. Pull all the data you need and then come up with answers.
The user is expecting your help with debugging and coming up with answers.

# Tone and style
Be concise, direct, and to the point.
Answer concisely with fewer than 4 lines (not including tool use or code generation), unless the user asks for detail.
Minimize output tokens while staying helpful and accurate. Keep responses short for a command line interface.

# Context
- Service ID for this session: ${serviceId}
- Logs from the service (if any): ${logs ? logs.slice(0, 8000) : "(none)"}

# Services/Components
The list of services that compose the software system:
${architecture || "(none)"}

# Log tools usage
- **tailLogs**: Last N lines of logs (e.g. "what just happened?").
- **getRecentErrors**: Recent N lines containing ERROR, WARN, FATAL, etc.
- **grepLogs**: Search logs for a pattern with context (like grep -A/-B).
- **readLogs**: Paginated (50 lines per page). Prefer the other log tools; don't call readLogs more than 3 times.
If a service's architecture does not list \`- logs\` in \`available_data\`, avoid log tools for that service.
If a tool returns "No Access to execute ...", do not retry; continue with other tools or explain the limitation.

# Tool calling
Use thinkTool before calling other tools to plan, and after tool calls to assess progress. Do not call thinkTool in parallel with other tools.
If you need more information, use the tools. If you are ready to answer, provide the answer directly.
Do not ask the user for permission to run tools. Only ask questions you cannot answer yourself.

# Answer format (when giving the final solution)
Keep it short; expand only if needed. Prefer:
1. File name, path, line number if available
2. Code changes or commands needed
3. New code that fixes the problem
4. One or two lines about the fix
5. Why this fixes the issue
If the answer does not involve code changes, give a simple answer and skip the above structure.`;

  const d = readFileSync(path.join(__dirname + '/gpt.txt')).toString('ascii');

  const borrowed = d.replace('${architecture}', architecture);

  return borrowed;
}

export function createTools(authKey?: string): Record<string, ReturnType<typeof tool>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {};
  const sendAndPoll = async (
    serviceId: string,
    functionName: string,
    args: Record<string, unknown>,
    timeoutMs: number = 60000
  ): Promise<string> => {
    const key = serviceId.trim();
    const socket = socketManager.getSocket(key);
    if (!socket) {
      console.log("[ai-sdk-query] No socket for service", key);
      return "";
    }
    const toolCallId = `${functionName}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const payload = {
      type: "tool_function_call",
      function_name: functionName,
      args,
      tool_call_id: toolCallId,
    };
    socket.send(JSON.stringify(payload));
    const pollInterval = 200;
    let elapsed = 0;
    while (elapsed < timeoutMs) {
      try {
        const result = await redisClient.get(toolCallId);
        if (result) {
          await redisClient.del(toolCallId);
          return result;
        }
      } catch (e) {
        console.error(`[ai-sdk-query] Redis poll error:`, e);
      }
      await sleep(pollInterval);
      elapsed += pollInterval;
    }
    return `Tool call timed out after ${timeoutMs}ms.`;
  };

  tools.thinkTool = tool({
    description: `Tool for strategic reflection. Use after each search to analyze results and plan next steps. Use before calling other tools to plan, and after tool calls to assess progress. Do not call thinkTool in parallel with other tools.`,
    parameters: z.object({
      reflection: z.string().describe("Your reflection on research progress, findings, gaps, and next steps"),
    }),
    execute: async ({ reflection }) => `Reflection recorded: ${reflection}`,
  });
  tools.grepCodeBasetool = tool({
    description:
      "Grep the codebase to find files that may contain the code you're looking for. Use readFileContents after this to read file contents. Returns matching line and path.",
    parameters: z.object({
      serviceId: z.string().describe("ID of the service whose code you want to search."),
      searchTerm: z.string().describe("Search term for the file and line number."),
    }),
    execute: async ({ serviceId, searchTerm }) =>
      sendAndPoll(serviceId, "grep_search", { searchTerm, max_results: 20 }, 60000),
  });
  tools.readFileContents = tool({
    description: "Read file contents from the codebase. Get lines before and after a line number.",
    parameters: z.object({
      serviceId: z.string().describe("ID of the service whose code file you want to read."),
      filePath: z.string().describe("Path to the file."),
      lineNumber: z.number().describe("Line number (1-based)."),
      before: z.number().optional().describe("Lines before."),
      after: z.number().optional().describe("Lines after."),
    }),
    execute: async ({ serviceId, filePath, lineNumber, before = 30, after = 30 }) =>
      sendAndPoll(serviceId, "read_file", { filePath, lineNumber, before, after }, 10000),
  });
  tools.readLogs = tool({
    description: "Read logs of the service (paginated, 50 lines per page). Prefer tailLogs/grepLogs/getRecentErrors; don't call readLogs more than 3 times.",
    parameters: z.object({
      serviceId: z.string().describe("ID of the service whose logs you want to read."),
      pageNumber: z.number().describe("Page number for the next 50 lines."),
    }),
    execute: async ({ serviceId, pageNumber }) =>
      sendAndPoll(serviceId, "read_logs", { pageNumber, max_results: 20 }, 60000),
  });
  tools.tailLogs = tool({
    description: "Last N lines from the in-memory logs. Use when you want to see what just happened.",
    parameters: z.object({
      serviceId: z.string().describe("ID of the service whose logs you want to read."),
      n: z.number().describe("Number of lines from the end to return."),
    }),
    execute: async ({ serviceId, n }) =>
      sendAndPoll(serviceId, "tail_logs", { n }, 60000),
  });
  tools.grepLogs = tool({
    description: "Search in-memory logs for a pattern; returns each match with surrounding context (like grep -A/-B).",
    parameters: z.object({
      serviceId: z.string().describe("ID of the service whose logs you want to search."),
      pattern: z.string().describe("Plain-text pattern to search for."),
      before: z.number().optional().describe("Context lines before each match (default 5)."),
      after: z.number().optional().describe("Context lines after each match (default 5)."),
    }),
    execute: async ({ serviceId, pattern, before = 5, after = 5 }) =>
      sendAndPoll(serviceId, "grep_logs", { pattern, before, after }, 60000),
  });
  tools.getRecentErrors = tool({
    description: "Most recent N log lines containing ERROR, WARN, FATAL, EXCEPTION, etc.",
    parameters: z.object({
      serviceId: z.string().describe("ID of the service whose logs you want to search."),
      n: z.number().describe("Number of recent error-like lines to return."),
    }),
    execute: async ({ serviceId, n }) =>
      sendAndPoll(serviceId, "get_recent_errors", { n }, 60000),
  });
  return tools;
}

/** AI SDK–native message format (what streamText expects). Client sends messages in this shape. */
export type CoreMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | Array<{ type: "text"; text: string } | { type: "tool-call"; toolCallId: string; toolName: string; args: unknown }> }
  | { role: "system"; content: string }
  | { role: "tool"; content: Array<{ type: "tool-result"; toolCallId: string; toolName: string; result: unknown }> };

export interface RunAISdkQueryInput {
  /** Client sends messages in the native AI SDK pattern (CoreMessage[]). */
  userQueryObj: {
    messages: CoreMessage[];
    logs: string;
    architecture: string;
    serviceId: string;
    planningDoc?: string;
  };
  authKey?: string;
  abortSignal?: AbortSignal;
}

/**
 * Generate text from CoreMessage[] (no tools). Used by v2 graph and summarize API.
 */
export async function generateTextFromMessages(
  messages: CoreMessage[],
  options?: { system?: string; temperature?: number }
): Promise<string> {
  const google = createGoogleGenerativeAI({ apiKey: config.gemini_api_key });
  const model = google("gemini-3-flash-preview");
  const result = await generateText({
    model,
    messages,
    system: options?.system,
    temperature: options?.temperature ?? 0.7,
  });
  return typeof result.text === "string" ? result.text : "";
}

/**
 * Run a single AI SDK streamText call with system prompt, messages, and tools.
 * Caller should iterate result.fullStream and send AI SDK–friendly chunks over WebSocket.
 */
export function runAISdkQuery(input: RunAISdkQueryInput) {
  const { userQueryObj, authKey, abortSignal } = input;
  const systemPrompt = buildSystemPrompt({
    logs: userQueryObj.logs,
    architecture: userQueryObj.architecture,
    serviceId: userQueryObj.serviceId,
  });
  const messages = userQueryObj.messages;
  const tools = createTools(authKey);
  const google = createGoogleGenerativeAI({ apiKey: config.gemini_api_key });
  const model = google("gemini-3-flash-preview");

  return streamText({
    model,
    system: systemPrompt,
    messages,
    tools,
    maxSteps: MAX_STEPS,
    abortSignal,
  });
}
