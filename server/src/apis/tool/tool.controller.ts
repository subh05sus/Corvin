import { FastifyReply, FastifyRequest } from "fastify";
import { GoogleGenAI } from "@google/genai";
import { BadRequestException } from "../../exception/badrequest.exception";
import { CustomException } from "../../exception/custom.exception";
import redisClient from "../../utils/redis";
import { config } from "../../config";

class ToolController {
  private geminiClient: GoogleGenAI | null = null;

  private getGeminiClient() {
    if (!config.gemini_api_key) {
      throw new CustomException({
        status: 500,
        code: "GEMINI_CONFIG_MISSING",
        message: "Missing Gemini configuration",
        description:
          "GEMINI_API_KEY is required to generate YAML names but was not found.",
      });
    }

    if (!this.geminiClient) {
      this.geminiClient = new GoogleGenAI({ apiKey: config.gemini_api_key });
    }
    return this.geminiClient;
  }
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
        // Prefer explicit tool result if provided, then resultArgs (legacy), then fall back to args
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
        console.log(
          "[handleToolFunctionCall] result length:",
          resultString.length
        );
        console.log(
          "[handleToolFunctionCall] result preview:",
          resultString.slice(0, 100)
        );

        console.log("[handleToolFunctionCall] Storing in Redis...");
        await redisClient.set(tool_call_id, resultString, {
          EX: 120, // Expire after 2 minutes
        });
        console.log("[handleToolFunctionCall] ✅ Stored in Redis successfully");

        // Verify it was stored
        // const verification = await redisClient.get(tool_call_id);
        // console.log(
        //   "[handleToolFunctionCall] Verification - data exists in Redis:",
        //   !!verification
        // );

        const response = {
          success: true,
          message: "Tool result stored successfully",
          data: {
            tool_call_id,
            function_name,
          },
        };

        reply.status(200).send(response);

        console.log(
          "[handleToolFunctionCall] ========== TOOL RESULT COMPLETE =========="
        );
      } catch (error) {
        console.error("[handleToolFunctionCall] ❌ Error:", error);
        throw new CustomException({
          status: 500,
          code: "E500",
          message: "Failed to store tool result",
          description:
            "An error occurred while storing the tool result in Redis",
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

      if (
        !description ||
        typeof description !== "string" ||
        !description.trim()
      ) {
        throw new BadRequestException({
          message: "Missing description",
          description: "Description is required to generate name.",
        });
      }

      const gemini = this.getGeminiClient();

      const systemPrompt =
        "You are a technical product naming assistant. Respond ONLY with a concise project name (maximum two words) that reflects the provided description. Avoid punctuation, quotes, the word 'project', file extensions, or extra commentary.";

      const userPrompt = `Description: ${description.trim()}
      Directory context (for reference only): ${currentDirectory || "Not provided"}

      Return only the project name, nothing else.`;

      const response = await gemini.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `${systemPrompt}\n\n${userPrompt}`,
        config: {
          temperature: 0.2,
          maxOutputTokens: 20,
        },
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
        data: {
          name: yamlName,
        },
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
