import { UnifiedChatRequest } from "../types/llm";
import { Transformer } from "../types/transformer";

export class GeminiTransformer implements Transformer {
  name = "Gemini";

  endPoint = "/v1beta/models/:model";

  // transformRequestIn(request: UnifiedChatRequest) {
  //     return {
  //         model: this.model,
  //         messages: request.messages.map(message => ({
  //             role: message.role,
  //             content: message.content,
  //             tool_calls: message.tool_calls || [],
  //         })),
  //         max_tokens: request.max_tokens,
  //         temperature: request.temperature,
  //         stream: request.stream,
  //         tools: request.tools?.map(tool => ({
  //             type: tool.type,
  //             function: {
  //                 name: tool.function.name,
  //                 description: tool.function.description,
  //                 parameters: tool.function.parameters,
  //             },
  //         })),
  //         tool_choice: request.tool_choice,
  //     };
  // }

  transformRequestOut(request: UnifiedChatRequest): UnifiedChatRequest {
    if (Array.isArray(request.tools)) {
      // rewrite tools definition
      request.tools.forEach((tool) => {
        if (tool.function.name === "BatchTool") {
          // HACK: Gemini does not support objects with empty properties
          tool.function.parameters.properties.invocations.items.properties.input.type =
            "number";
          return;
        }
        Object.keys(tool.function.parameters.properties).forEach((key) => {
          const prop = tool.function.parameters.properties[key];
          if (
            prop.type === "string" &&
            !["enum", "date-time"].includes(prop.format)
          ) {
            delete prop.format;
          }
        });
      });
    }
    return request;
  }

  // transformResponseIn(response: GeminiChatResponse): UnifiedChatResponse {
  //     return {
  //         id: response.id,
  //         model: response.model,
  //         content: response.content || null,
  //         usage: response.usage ? {
  //             prompt_tokens: response.usage.prompt_tokens,
  //             completion_tokens: response.usage.completion_tokens,
  //             total_tokens: response.usage.total_tokens,
  //         } : undefined,
  //         tool_calls: response.tool_calls?.map(call => ({
  //             id: call.id,
  //             type: call.type,
  //             function: {
  //                 name: call.function.name,
  //                 arguments: call.function.arguments,
  //             },
  //         })),
  //     };
  // }

  async transformResponseOut(response: Response): Promise<Response> {
    return response;
  }
}
