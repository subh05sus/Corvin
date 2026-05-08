import { FastifyInstance } from "fastify";
import routes from "./health.route";

export default async (fastify: FastifyInstance) => {
  for (const route of routes) {
    if (Array.isArray(route.preHandler)) {
        route.preHandler = [...route.preHandler];
    }
    fastify.route(route as any);
  }
};