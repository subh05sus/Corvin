export const healthSchema = {
    description: "Api endpoint for health check",
    tags: ["Health"],
    summary: "health check  api",
    response: {
      200: {
        description: "successs response",
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
          uptime: { type: "number" },
        },
      },
    },
};

export const minimumCliVersionSchema = {
    description: "Api endpoint to get minimum required CLI version",
    tags: ["Health"],
    summary: "Get minimum CLI version API",
    response: {
      200: {
        description: "success response",
        type: "object",
        properties: {
          success: { type: "boolean" },
          minimumCliVersion: { type: "string" },
        },
      },
    },
};
