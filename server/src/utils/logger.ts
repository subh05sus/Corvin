import rTracer from "cls-rtracer";
import { FastifyRequest } from "fastify";
import { config } from "../config";

export const logger = {
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'yyyy-mm-dd HH:MM:ss.l o',
      ignore: 'pid,hostname',
    },
  },
};

export default logger;
export const rTracerPlugin = rTracer.fastifyPlugin;
