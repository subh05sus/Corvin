import { FastifyReply, FastifyRequest } from "fastify";
import { generateText } from "ai";
import { BadRequestException } from "../../exception/badrequest.exception";
import { CustomException } from "../../exception/custom.exception";
import redisClient from "../../utils/redis";
import { validateAuthKey } from "../../utils/auth";
import { resolveModel, serverFallbackConfig } from "../../services/ai-provider";

class ToolController {
  private sanitizeName(rawName: string) {
    const cleaned = rawName
      .replace(/[^a-zA-Z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) {
      return "";
    }

    const words = cleaned.split(" ").filter(Boolean);
    return words.slice(0, 2).join(" ");
  }

  handleToolFunctionCall = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tool_call_id, result, resultArgs, args, function_name }: any =
        req.body;

      if (!tool_call_id) {
        throw new BadRequestException({
          message: "Missing tool_call_id",
          description: "tool_call_id is required for tool function call",
        });
      }

      if (!result && !resultArgs && !args) {
        throw new BadRequestException({
          message: "Missing result and args",
          description: "Either result or args must be provided",
        });
      }

      try {
        const resultData =
          typeof result !== "undefined" && result !== null
            ? result
            : typeof resultArgs !== "undefined" && resultArgs !== null
              ? resultArgs
              : args;
        const resultString =
          typeof resultData === "string"
            ? resultData
            : JSON.stringify(resultData);

        console.log("[handleToolFunctionCall] tool_call_id:", tool_call_id);
        console.log("[handleToolFunctionCall] result length:", resultString.length);
        console.log("[handleToolFunctionCall] result preview:", resultString.slice(0, 100));
        console.log("[handleToolFunctionCall] Storing in Redis...");

        await redisClient.set(tool_call_id, resultString, { EX: 120 });
        console.log("[handleToolFunctionCall] ✅ Stored in Redis successfully");

        reply.status(200).send({
          success: true,
          message: "Tool result stored successfully",
          data: { tool_call_id, function_name },
        });

        console.log("[handleToolFunctionCall] ========== TOOL RESULT COMPLETE ==========");
      } catch (error) {
        console.error("[handleToolFunctionCall] ❌ Error:", error);
        throw new CustomException({
          status: 500,
          code: "E500",
          message: "Failed to store tool result",
          description: "An error occurred while storing the tool result in Redis",
        });
      }
    } catch (error: any) {
      reply.status(error.status || 500).send({
        success: false,
        message: error.message || "Internal Server Error",
        description: error.description,
      });
    }
  };

  handleGenerateYamlName = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { currentDirectory, description }: any = req.body;

      if (!description || typeof description !== "string" || !description.trim()) {
        throw new BadRequestException({
          message: "Missing description",
          description: "Description is required to generate name.",
        });
      }

      // Resolve provider: check auth header first, then server fallback.
      let providerCfg = serverFallbackConfig();
      const authHeader = (req.headers as any)["authorization"] as string | undefined;
      if (authHeader) {
        const bearerKey = authHeader.replace(/^Bearer\s+/i, "").trim();
        if (bearerKey) {
          const session = await validateAuthKey(bearerKey);
          if (session?.ai) providerCfg = session.ai;
        }
      }

      if (!providerCfg) {
        throw new CustomException({
          status: 503,
          code: "NO_AI_PROVIDER",
          message: "No AI provider configured",
          description: "Add your API key at /dashboard/ai-keys or set GEMINI_API_KEY in the server environment.",
        });
      }

      const model = resolveModel(providerCfg);

      const systemPrompt =
        "You are a technical product naming assistant. Respond ONLY with a concise project name (maximum two words) that reflects the provided description. Avoid punctuation, quotes, the word 'project', file extensions, or extra commentary.";

      const userPrompt = `Description: ${description.trim()}
      Directory context (for reference only): ${currentDirectory || "Not provided"}

      Return only the project name, nothing else.`;

      const response = await generateText({
        model,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        temperature: 0.2,
        maxTokens: 20,
      });

      const rawName = response.text?.trim() || "";
      const yamlName = this.sanitizeName(rawName);

      if (!yamlName) {
        throw new CustomException({
          status: 500,
          code: "YAML_NAME_EMPTY",
          message: "Failed to generate YAML name",
          description: "The AI response did not contain a valid name.",
        });
      }

      reply.status(200).send({
        success: true,
        message: "Project name generated successfully",
        data: { name: yamlName },
      });
    } catch (error: any) {
      const status = error.status || 500;
      reply.status(status).send({
        success: false,
        message: error.message || "Internal Server Error",
        description: error.description || "Failed to generate YAML name",
      });
    }
  };
}

export default new ToolController();
