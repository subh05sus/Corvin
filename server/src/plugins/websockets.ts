import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import fastifyWebsocket from "@fastify/websocket";
import type { WebSocket } from "ws";
import { HashMapManager } from "../utils/hashmap";
import { config } from "../config";
import redisClient from "../utils/redis";
import { runAISdkQuery, type CoreMessage } from "../services/ai-sdk-query";
import socketManager from "../utils/socketManager";
import { STATIC_USER_ID } from "../utils/constants";

declare module "ws" {
  interface WebSocket {
    isAlive?: boolean;
    userId?: string;
    socketId?: string;
  }
}

async function websocketPlugin(fastify: FastifyInstance, opts: object) {
  const connectionManager = new HashMapManager();

  type ConversationEntry = {
    logs: string;
    lastQuery?: string;
    serializedState?: string;
    awaitingUserResponse?: boolean;
    clarificationQuestion?: string;
  };

  const DEFAULT_ARCHITECTURE: any[] = [];

  const conversationState = new Map<string, ConversationEntry>();
  const activeQueryControllers = new Map<WebSocket, AbortController>();

  fastify.register(fastifyWebsocket, {
    options: { clientTracking: true },
  });

  function sendToSocket(socket: WebSocket, message: ServerMessage): void {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }

  /** Serialize AI SDK fullStream part to a JSON-safe payload for WebSocket (AI SDK–friendly format). */
  function serializeAISdkStreamPart(part: unknown): Record<string, unknown> | null {
    const p = part as Record<string, unknown>;
    const type = p.type as string;
    if (!type) return null;
    const payload: Record<string, unknown> = { partType: type };
    switch (type) {
      case "text-delta":
        if (typeof (p.textDelta ?? p.text) === "string") payload.text = p.textDelta ?? p.text;
        break;
      case "text":
        if (typeof (p.text ?? p.textDelta) === "string") payload.text = p.text ?? p.textDelta;
        break;
      case "tool-call":
        payload.toolCallId = p.toolCallId;
        payload.toolName = p.toolName;
        payload.args = p.args;
        break;
      case "tool-result":
        payload.toolCallId = p.toolCallId;
        payload.toolName = p.toolName;
        payload.result = p.result;
        break;
      case "tool-error":
        payload.toolCallId = p.toolCallId;
        payload.toolName = p.toolName;
        payload.error = p.error instanceof Error ? (p.error as Error).message : p.error;
        break;
      case "start-step":
      case "finish-step":
        payload.finishReason = p.finishReason;
        payload.usage = p.usage;
        break;
      case "finish":
        payload.finishReason = p.finishReason;
        payload.usage = p.usage;
        payload.totalUsage = p.totalUsage;
        break;
      case "error":
        payload.error = p.error instanceof Error ? (p.error as Error).message : p.error;
        break;
      case "start":
        payload.messageId = p.messageId;
        break;
      default:
        payload.raw = p;
    }
    return payload;
  }

  /**
   * Normalize messages for the API: assistant messages with content that includes tool-call parts
   * must not be sent without corresponding tool-role messages. The CLI only has assistant messages
   * with mixed content (text + tool-call), so strip tool-call parts and keep only text.
   */
  function normalizeMessagesForApi(messages: CoreMessage[]): CoreMessage[] {
    return messages.map((msg) => {
      if (msg.role !== "assistant") return msg;
      const content = msg.content;
      if (typeof content === "string") return msg;
      if (!Array.isArray(content)) return msg;
      const textOnly = content
        .filter((p): p is { type: "text"; text: string } => p.type === "text" && typeof (p as { text?: string }).text === "string")
        .map((p) => p.text)
        .join("");
      return { ...msg, content: textOnly };
    });
  }


  function extractFinalMessage(result: any): string {
    if (!result?.messages || result.messages.length === 0) {
      return "No response generated.";
    }

    const finalMessage = result.messages[result.messages.length - 1];
    if (typeof finalMessage?.content === "string") {
      return finalMessage.content;
    }

    return JSON.stringify(finalMessage?.content ?? "");
  }

  function sendGraphResponse(
    socket: WebSocket,
    result: any,
    serializedState?: string,
    payload?: any
  ) {
    const messages: CoreMessage[] = result?.messages ?? [];
    sendToSocket(socket, {
      type: "response",
      data: {
        messages,
        sender: result.sender,
        planningDoc: result.planningDoc,
        summary: result.summary,
      },
      ts: Date.now(),
    });
    return;
  }
  // function sendGraphResponse(
  //   socket: WebSocket,
  //   result: any,
  //   serializedState?: string,
  //   payload?: any
  // ) {
  //   const awaitingUserResponse =
  //     result?.control?.awaiting_user_response === true;
  //   const clarificationQuestion = result?.control?.clarification_question;
  //   const finalMessage = extractFinalMessage(result);
  //   const statePayload = payload ?? null;

  //   if (awaitingUserResponse) {
  //     sendToSocket(socket, {
  //       type: "ask_user",
  //       data: {
  //         question:
  //           clarificationQuestion ||
  //           "The assistant needs additional clarification.",
  //         state: statePayload,
  //         stateSerialized: serializedState,
  //       },
  //       ts: Date.now(),
  //     });
  //   } else {
  //     sendToSocket(socket, {
  //       type: "response",
  //       data: {
  //         finalMessage,
  //         state: statePayload,
  //         stateSerialized: serializedState,
  //       },
  //       ts: Date.now(),
  //     });
  //     sendToSocket(socket, { type: "response_complete", ts: Date.now() });
  //   }

  //   return { awaitingUserResponse, clarificationQuestion };
  // }

  fastify.register(async function (fastify) {
    fastify.get("/v2/ws", { websocket: true }, (socket, request) => {
      socket.isAlive = true;

      socket.on("pong", () => {
        socket.isAlive = true;
      });

      fastify.log.info({ ip: request.ip }, "New WebSocket connection");

      sendToSocket(socket, {
        type: "welcome",
        message: "WebSocket connection established. Send connection request.",
        ts: Date.now(),
        reqId: request.id,
      });

      async function handleToolFunctionCall(
        socket: WebSocket,
        msg: ClientMessage
      ) {
        if (!msg?.tool_call_id) {
          console.error("[handleToolFunctionCall] ❌ Missing tool_call_id");
          return sendToSocket(socket, {
            type: "error",
            message: "Missing tool_call_id in tool_function_call",
            ts: Date.now(),
          });
        }

        if (!msg?.result && !msg?.args) {
          console.error(
            "[handleToolFunctionCall] ❌ Missing both result and args"
          );
          return sendToSocket(socket, {
            type: "error",
            message: "Missing result or args in tool_function_call",
            ts: Date.now(),
          });
        }

        try {
          const resultData = msg.result || msg.args;
          const result =
            typeof resultData === "string"
              ? resultData
              : JSON.stringify(resultData);

          console.log(
            "[handleToolFunctionCall] tool_call_id:",
            msg.tool_call_id
          );
          console.log("[handleToolFunctionCall] result length:", result.length);
          console.log(
            "[handleToolFunctionCall] result preview:",
            result.slice(0, 100)
          );

          console.log("[handleToolFunctionCall] Storing in Redis...");
          await redisClient.set(msg.tool_call_id, result, {
            EX: 120, // Expire after 2 minutes
          });
          console.log(
            "[handleToolFunctionCall] ✅ Stored in Redis successfully"
          );

          // Verify it was stored
          const verification = await redisClient.get(msg.tool_call_id);
          console.log(
            "[handleToolFunctionCall] Verification - data exists in Redis:",
            !!verification
          );

          sendToSocket(socket, {
            type: "progress",
            step: "tool_result_received",
            data: {
              tool_call_id: msg.tool_call_id,
              function_name: msg.function_name,
            },
            ts: Date.now(),
          });

          console.log(
            "[handleToolFunctionCall] ========== TOOL RESULT COMPLETE =========="
          );
        } catch (error) {
          console.error("[handleToolFunctionCall] ❌ Error:", error);
          sendToSocket(socket, {
            type: "error",
            message: "Failed to store tool result",
            ts: Date.now(),
          });
        }
      }

      socket.on("message", async (raw) => {
        let msg: ClientMessage | null = null;
        try {
          if (socket.socketId) {
            connectionManager.updateLastActivity(socket.socketId);
          }

          const rawString = raw.toString();
          fastify.log.debug({ rawMessage: rawString }, "Raw message received");

          let messageString: string;
          if (Buffer.isBuffer(raw)) {
            messageString = raw.toString("utf8");
          } else if (raw instanceof ArrayBuffer) {
            messageString = Buffer.from(raw).toString("utf8");
          } else {
            messageString = raw.toString();
          }

          messageString = messageString.trim();

          if (!messageString) {
            sendToSocket(socket, {
              type: "error",
              message: "Empty message received",
              ts: Date.now(),
            });
            return;
          }

          try {
            msg = JSON.parse(messageString);
            if (msg?.type === "query") {
              fastify.log.info("[websocket] Incoming message type: query");
            }
          } catch (jsonError) {
            sendToSocket(socket, {
              type: "error",
              message: "Invalid JSON format",
              data: { receivedData: messageString.substring(0, 100) },
              ts: Date.now(),
            });
            fastify.log.error(
              { error: jsonError, rawMessage: messageString },
              "JSON parsing failed"
            );
            return;
          }

          if (!msg) {
            return;
          }

          switch (msg.type) {
            case "recurring_connection":
              await handleRecurringConnection(socket, msg, request);
              break;

            case "query":
              await handleQuery(socket, msg);
              break;

            case "cancel_query":
              const abortController = activeQueryControllers.get(socket);
              if (abortController && !abortController.signal.aborted) {
                abortController.abort();
                console.log("[cancel_query] Query cancelled for socket");
                sendToSocket(socket, {
                  type: "progress",
                  step: "cancelled",
                  message: "Query cancelled by user",
                  ts: Date.now(),
                });
              } else {
                sendToSocket(socket, {
                  type: "progress",
                  step: "cancelled",
                  message: "No active query to cancel",
                  ts: Date.now(),
                });
              }
              break;


            case "file_contents":
              await handleFileContents(socket, msg);
              break;

            case "tool_function_call":
              await handleToolFunctionCall(socket, msg);
              break;

            case "is_service_available":
              socket.send(
                JSON.stringify({
                  xx: socketManager.getSocket(msg.serviceId || ""),
                })
              );
              break;

            case "ping":
              console.log(`_______________ SOCKET_DICT ________________`);
              console.log(socketManager.getKeys());
              sendToSocket(socket, {
                type: "pong",
                ts: Date.now(),
              });
              break;

            default:
              if (msg.query && typeof msg.query === "string") {
                await handleQuery(socket, { ...msg, type: "query" });
              } else {
                sendToSocket(socket, {
                  type: "error",
                  message:
                    "Unknown message type. Expected: recurring_connection, query, user_reply, file_contents, tool_function_call, or ping",
                  data: { receivedMessage: msg },
                  ts: Date.now(),
                });
              }
          }
        } catch (parseError) {
          sendToSocket(socket, {
            type: "error",
            message: "Failed to process message",
            ts: Date.now(),
          });

          fastify.log.error(
            { error: parseError },
            "Failed to parse client message"
          );
        }
      });

      socket.on("close", async () => {
        activeQueryControllers.delete(socket);
        
        if (socket.socketId) {
          connectionManager.removeConnection(socket.socketId);
          fastify.log.info(
            {
              ip: request.ip,
              userId: STATIC_USER_ID,
              socketId: socket.socketId,
            },
            "WebSocket connection closed"
          );
        }
      });

      socket.on("error", (error) => {
        if (socket.socketId) {
          connectionManager.removeConnection(socket.socketId);
        }
        fastify.log.error({ error, ip: request.ip }, "WebSocket error");
      });

      async function handleRecurringConnection(
        socket: WebSocket,
        msg: ClientMessage,
        request: any
      ) {
        try {
          console.log(
            `[handleRecurringConnection] serviceId: ${msg.serviceId}`
          );
          
          if (!msg.serviceId) {
            console.log("[handleRecurringConnection] Missing serviceId");
            sendToSocket(socket, {
              type: "error",
              message: "serviceId is required for recurring connections",
              ts: Date.now(),
            });
            return;
          }


          socket.userId = STATIC_USER_ID;
          
          console.log(
            "[handleRecurringConnection] Setting socket for serviceId:",
            msg.serviceId
          );

          socketManager.setSocket(msg.serviceId, socket);

          console.log("[handleRecurringConnection] Connection established");

          sendToSocket(socket, {
            type: "user_assigned",
            message: "Recurring connection established successfully",
            ts: Date.now(),
          });

          fastify.log.info(
            {
              userId: STATIC_USER_ID,
              serviceId: msg.serviceId,
              ip: request.ip,
            },
            "Recurring connection established"
          );
        } catch (error) {
          sendToSocket(socket, {
            type: "error",
            message: "Failed to establish recurring connection",
            ts: Date.now(),
          });

          fastify.log.error(
            { error, serviceId: msg.serviceId },
            "Failed to handle recurring connection"
          );
        }
      }

      async function handleQuery(socket: WebSocket, msg: ClientMessage) {
        try {
          if (!msg.serviceId) {
            sendToSocket(socket, {
              type: "error",
              message: "serviceId is required",
              ts: Date.now(),
            });
            return;
          }

          const geminiKey = config.gemini_api_key;
          if (!geminiKey || geminiKey === "undefined" || geminiKey.trim() === "") {
            fastify.log.warn("[handleQuery] GEMINI_API_KEY is missing or invalid; AI SDK will fail");
            sendToSocket(socket, {
              type: "error",
              message: "Server misconfiguration: GEMINI_API_KEY is not set. Please set GEMINI_API_KEY in the backend environment.",
              ts: Date.now(),
            });
            return;
          }

          // userQuery -> messages, logs, architecture
          if (
            !msg.userQuery ||
            !msg.userQuery.messages ||
            !msg.userQuery.architecture
          ) {
            sendToSocket(socket, {
              type: "error",
              message: "Please send the user query",
              ts: Date.now(),
            });

            return;
          }

          let userQueryObj: {
            messages: CoreMessage[];
            logs: string;
            architecture: string;
            serviceId: string;
            planningDoc?: string;
          };

          if (msg.graphState && typeof msg.graphState === "object") {
            const stateMessages = (Array.isArray(msg.graphState.messages) ? msg.graphState.messages : []) as CoreMessage[];
            const newMessages = (Array.isArray(msg.userQuery.messages) ? msg.userQuery.messages : []) as CoreMessage[];
            userQueryObj = {
              messages: [...stateMessages, ...newMessages],
              logs: msg.graphState.logs || msg.userQuery.logs || "",
              architecture: msg.graphState.architecture || msg.userQuery.architecture || "",
              serviceId: msg.serviceId,
              planningDoc: msg.graphState.planningDoc || msg.planningDoc || "",
            };
          } else {
            const messages = (Array.isArray(msg.userQuery.messages) ? msg.userQuery.messages : []) as CoreMessage[];
            userQueryObj = {
              messages,
              logs: msg.userQuery.logs || "",
              architecture: msg.userQuery.architecture || "",
              serviceId: msg.serviceId,
            };
          }

          // API requires: assistant messages with tool_calls must be followed by tool result messages.
          // CLI state has assistant messages with tool-call parts but no tool-role messages, so strip
          // tool-call parts and keep only text to avoid "tool_call_ids did not have response messages".
          userQueryObj.messages = normalizeMessagesForApi(userQueryObj.messages);

          const abortController = new AbortController();
          activeQueryControllers.set(socket, abortController);
          const cleanup = () => activeQueryControllers.delete(socket);

          fastify.log.info("[handleQuery] Calling runAISdkQuery (Gemini request will start on first stream read)");
          const result = runAISdkQuery({
            userQueryObj,
            authKey: msg.authKey,
            abortSignal: abortController.signal,
          });
          fastify.log.info("[handleQuery] Consuming stream (waiting for first chunk from Gemini)");

          let partCount = 0;
          for await (const part of result.fullStream) {
            partCount++;
            if (partCount === 1) {
              const p = part as { type?: string };
              fastify.log.info({ partType: p?.type }, "[handleQuery] First stream part received");
            }
            if (abortController.signal.aborted) {
              console.log("[handleQuery] Query cancelled by user");
              sendToSocket(socket, {
                type: "progress",
                step: "cancelled",
                message: "Query cancelled by user",
                ts: Date.now(),
              });
              cleanup();
              return;
            }
            const payload = serializeAISdkStreamPart(part);
            if (payload) {
              const partType = (part as { type?: string })?.type;
              if (partType === "finish" || partType === "finish-step") {
                fastify.log.info({ partType, partCount }, "[handleQuery] Sending stream end part to client");
              }
              if (partType === "error") {
                const errMsg = (payload as { error?: string }).error;
                fastify.log.warn({ error: errMsg, partCount }, "[handleQuery] AI SDK stream error part, sending to client");
              }
              sendToSocket(socket, {
                type: "response",
                data: { stream: "ai-sdk", ...payload },
                ts: Date.now(),
              });
            }
          }

          fastify.log.info({ partCount }, "[handleQuery] Stream finished");
          // to-do update tracking event function once streaming done
          // if (userId) {
          //   await trackEvent(userId, "Query Completed", {
          //     email: userEmail,
          //     queryId,
          //     serviceId: msg.serviceId,
          //     nodeCount,
          //     nodeNames: nodeNames.join(","),
          //   }).catch(() => {});
          // }
          cleanup();
        } catch (error) {
          activeQueryControllers.delete(socket);
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error("[handleQuery] Error:", errorMessage, error);
          sendToSocket(socket, {
            type: "error",
            message: errorMessage || "Failed to process query",
            ts: Date.now(),
          });

          fastify.log.error({ error }, "Failed to handle query");
        }
      }
      // async function handleQuery(socket: WebSocket, msg: ClientMessage) {
      //   try {
      //     if (!socket.userId || !socket.socketId) {
      //       sendToSocket(socket, {
      //         type: "error",
      //         message:
      //           "Please establish connection first (send recurring_connection)",
      //         ts: Date.now(),
      //       });
      //       return;
      //     }

      //     console.log("[handleQuery] ========== INITIAL CLIENT DATA ==========");
      //     console.log("[handleQuery] Query:", typeof msg.query === "string" ? msg.query.slice(0, 200) : msg.query);
      //     console.log("[handleQuery] Logs length:", typeof msg.logs === "string" ? msg.logs.length : 0);
      //     console.log("[handleQuery] Has state:", !!(msg as any)?.state);
      //     console.log("[handleQuery] =========================================");

      //     const key = socket.socketId as string;
      //     const prior =
      //       conversationState.get(key) || ({
      //         logs: "",
      //       } as ConversationEntry);

      //     const hasQuery =
      //       typeof msg.query === "string" && msg.query.trim().length > 0;
      //     const userQuery =
      //       (hasQuery ? (msg.query as string).trim() : undefined) ??
      //       prior.lastQuery ??
      //       "";

      //     const incomingLogs =
      //       typeof msg.logs === "string" && msg.logs.trim().length > 0
      //         ? msg.logs
      //         : undefined;
      //     const userLogs = incomingLogs ?? prior.logs ?? "";

      //     if (!userQuery && !userLogs) {
      //       sendToSocket(socket, {
      //         type: "error",
      //         message:
      //           'Missing input. Provide logs or include { query: "..." } to continue.',
      //         data: { receivedMessage: msg },
      //         ts: Date.now(),
      //       });
      //       return;
      //     }

      //     const hasExceededLimit = await userService.hasExceededMonthlyLimit(
      //       socket.userId!
      //     );
      //     if (hasExceededLimit) {
      //       return sendToSocket(socket, {
      //         type: "error",
      //         message:
      //           "Monthly Token Usage Limit Reached. Tokens will reset next month.",
      //         ts: Date.now(),
      //       });
      //     }

      //     if (!msg.state && !prior.serializedState) {
      //       await userService.logUserEntry(socket.userId!);
      //     }

      //     const stateFromClient = deserializeGraphStateInput((msg as any)?.state);
      //     const stateFromServer = prior.serializedState
      //       ? deserializeGraphStateInput(prior.serializedState)
      //       : undefined;
      //     const existingState = stateFromClient || stateFromServer;

      //     const result = await runDebugGraphV2(
      //       userQuery,
      //       userLogs,
      //       DEFAULT_ARCHITECTURE,
      //       existingState,
      //       {
      //         fastify,
      //         redis: redisClient,
      //         userId: socket.userId,
      //       }
      //     );

      //     const { serializedState, payload } = serializeGraphState(result);

      //     conversationState.set(key, {
      //       logs: result?.user_logs ?? userLogs,
      //       lastQuery: result?.user_query ?? userQuery,
      //       serializedState,
      //       awaitingUserResponse:
      //         result?.control?.awaiting_user_response === true,
      //       clarificationQuestion: result?.control?.clarification_question,
      //     });

      //     sendGraphResponse(socket, result, serializedState, payload);
      //   } catch (error) {
      //     console.error("[handleQuery] Error:", error);
      //     sendToSocket(socket, {
      //       type: "error",
      //       message: "Failed to process query",
      //       ts: Date.now(),
      //     });
      //     fastify.log.error({ error }, "Failed to handle query");
      //   }
      // }


      async function handleFileContents(socket: WebSocket, msg: ClientMessage) {
        console.log(
          "[handleFileContents] ========== FILE CONTENTS RECEIVED =========="
        );
        console.log("[handleFileContents] File:", msg.filePath);

        if (
          !msg?.filePath ||
          typeof msg.filePath !== "string" ||
          typeof msg.fileContent !== "string"
        ) {
          console.error("[handleFileContents] Missing filePath or fileContent");
          return sendToSocket(socket, {
            type: "error",
            message: "Missing filePath or fileContent in file_contents",
            ts: Date.now(),
          });
        }

        const key = socket.socketId as string;
        if (!conversationState.has(key)) {
          conversationState.set(key, {
            logs: "",
          });
        }

        const contentMsg = `FILE ${msg.filePath}:\n\n${msg.fileContent}`;

        sendToSocket(socket, {
          type: "progress",
          step: "file_received",
          data: { filePath: msg.filePath, size: msg.fileContent.length },
          ts: Date.now(),
        });
      }
    });
  });

  const interval = setInterval(async () => {
    for (const client of fastify.websocketServer.clients) {
      // @ts-ignore
      if (!client.isAlive) {
        // @ts-ignore
        if (client.socketId) {
          // @ts-ignore
          connectionManager.removeConnection(client.socketId);
        }
        client.terminate();
        continue;
      }

      // @ts-ignore
      client.isAlive = false;
      client.ping();
    }
    const cleanedCount = connectionManager.cleanupStaleConnections(3600000);
    if (cleanedCount > 0) {
      fastify.log.info({ cleanedCount }, "Cleaned up stale connections");
    }
  }, 30_000);

  fastify.addHook("onClose", async () => {
    clearInterval(interval);
  });

  fastify.decorate("connectionManager", connectionManager);
}

export default fp(websocketPlugin);

declare module "fastify" {
  interface FastifyInstance {
    connectionManager: HashMapManager;
  }
}
