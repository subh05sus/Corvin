export const summarizeGraphSchema = {
  description: "API endpoint for summarizing graph conversation",
  tags: ["Graph"],
  summary: "Summarize graph conversation API",
  body: {
    type: "object",
    required: ["graphState"],
    properties: {
      graphState: {
        type: "object",
        description: "The entire graph state object containing conversation history",
      },
    },
  },
  response: {
    200: {
      description: "Success response with summary",
      type: "object",
      properties: {
        success: { type: "boolean" },
        summary: { type: "string" },
      },
    },
    400: {
      description: "Bad request response",
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        description: { type: "string" },
      },
    },
    500: {
      description: "Internal server error response",
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        description: { type: "string" },
      },
    },
  },
};

