export const toolFunctionCallSchema = {
  description: "API endpoint for handling tool function call results",
  tags: ["Tool"],
  summary: "Tool function call API",
  body: {
    type: "object",
    required: ["tool_call_id"],
    properties: {
      tool_call_id: { 
        type: "string",
        description: "Unique identifier for the tool call"
      },
      result: { 
        type: "string",
        description: "Result data from the tool function call"
      },
      args: { 
        type: "object",
        description: "Arguments passed to the tool function"
      },
      function_name: { 
        type: "string",
        description: "Name of the function that was called"
      }
    }
  },
  response: {
    200: {
      description: "Success response",
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        data: {
          type: "object",
          properties: {
            tool_call_id: { type: "string" },
            function_name: { type: "string" },
          }
        }
      }
    },
    400: {
      description: "Bad request response",
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        description: { type: "string" }
      }
    },
    500: {
      description: "Internal server error response",
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        description: { type: "string" }
      }
    }
  }
};
