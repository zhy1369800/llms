import { UnifiedChatRequest } from "@/types/llm";
import { Transformer } from "../types/transformer";

export class Openrouter implements Transformer {
  name = "openrouter";

  transformRequestIn(request: UnifiedChatRequest): UnifiedChatRequest {
    if (request.tools?.length) {
      request.tool_choice = "required";
      request.tools.unshift({
        type: "function",
        function: {
          name: "ExitTool",
          description:
            "When the current task does not require tool usage, call this tool to exit tool mode — this is the only allowed way to terminate tool mode.",
          parameters: {
            type: "object",
            properties: {
              response: {
                type: "string",
                description:
                  "Your response will be forwarded to the user exactly as returned — the tool will not modify or post-process it in any way.",
              },
            },
            required: ["response"],
          },
        },
      });
    }
    return request;
  }
}
