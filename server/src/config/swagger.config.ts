import { SwaggerOptions } from "@fastify/swagger";

export const swaggerConfig: SwaggerOptions = {
  swagger: {
    info: {
      title: "Clippy",
      description: "ClippyAPI",
      version: "0.1.0",
    },
    externalDocs: {
      url: "https://swagger.io",
      description: "Find more info here",
    },
    consumes: ["application/json"],
    produces: ["application/json"],
    tags: [
      { name: "Health", description: "Health check endpoint" },
    ],
    securityDefinitions: {
      ApiToken: {
        description: 'Authorization header token, sample: "Bearer #TOKEN#"',
        type: "apiKey",
        name: "authorization",
        in: "header",
      },
    },
  },
};

export const swaggerUiConfig = {
  // routePrefix: "/docs",
  uiConfig: {
    docExpansion: "full",
    deepLinking: false,
  },
  staticCSP: true,
  exposeRoute: true,
};
