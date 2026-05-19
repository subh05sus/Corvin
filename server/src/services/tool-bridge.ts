import socketManager from "../utils/socketManager";
import redisClient from "../utils/redis";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function sendAndPoll(
  serviceId: string,
  functionName: string,
  args: Record<string, unknown>,
  timeoutMs: number = 60000
): Promise<string> {
  const key = serviceId.trim();
  const socket = socketManager.getSocket(key);
  if (!socket) {
    return `No active connection for service "${serviceId}". Make sure the service is running with \`corvin <cmd>\`.`;
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
      console.error(`[tool-bridge] Redis poll error:`, e);
    }
    await sleep(pollInterval);
    elapsed += pollInterval;
  }
  return `Tool call timed out after ${timeoutMs}ms.`;
}
