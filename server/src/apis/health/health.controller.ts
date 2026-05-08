import { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../../config";

class HealthController {
  healthCheck = async (req: FastifyRequest, reply: FastifyReply) => {
    const healthResponse = {
      success: true,
      message: "Health check successful",
      uptime: process.uptime(),
    };
    reply.status(200).send(healthResponse);
  };

  getMinimumCliVersion = async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const response = {
        success: true,
        minimumCliVersion: config.minimum_cli_version,
      };
      reply.status(200).send(response);
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        message: "Failed to get minimum CLI version",
      });
    }
  };
}

export default new HealthController();
