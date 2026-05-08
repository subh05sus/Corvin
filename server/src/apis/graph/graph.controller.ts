import { FastifyReply, FastifyRequest } from "fastify";
import { BadRequestException } from "../../exception/badrequest.exception";
import { generateTextFromMessages } from "../../services/ai-sdk-query";

class GraphController {
  summarize = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { graphState }: any = req.body;

      if (!graphState || typeof graphState !== "object") {
        throw new BadRequestException({
          message: "Invalid graph state",
          description: "The graphState is required and must be an object",
        });
      }

      const systemPrompt = `You are a summarizing agent. Take this conversation between the ai debugging agent and the user as an input and now create a summary to the user of what the ai has done with the approach to solve the user issue.`;

      const graphStateString = JSON.stringify(graphState, null, 2);

      const messages = [
        { role: "system" as const, content: systemPrompt },
        {
          role: "user" as const,
          content: `Here is the conversation state:\n\n${graphStateString}\n\nPlease provide a summary of what the AI debugging agent has done to solve the user's issue. The total summary has to be crisp and to the point wihtout losing any information.`,
        },
      ];

      const summary = await generateTextFromMessages(messages, {
        temperature: 0,
      });

      reply.status(200).send({
        success: true,
        summary: summary,
      });
    } catch (error: any) {
      reply.status(error.status || 500).send({
        success: false,
        message: error.message || "Internal Server Error",
        description: error.description || error.message,
      });
    }
  };
}

export default new GraphController();
