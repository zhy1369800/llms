import { UnifiedChatRequest } from "../types/llm";
import { Transformer, TransformerOptions } from "../types/transformer";

export class MaxCompletionTokens implements Transformer {
  static TransformerName = "maxcompletiontokens";
  max_completion_tokens: number;

  constructor(private readonly options?: TransformerOptions) {
    this.max_completion_tokens = this.options?.max_completion_tokens;
  }

  async transformRequestIn(request: UnifiedChatRequest): Promise<UnifiedChatRequest> {
    if (request.max_tokens) {
      delete request.max_tokens;
    }
    request.max_tokens = this.max_completion_tokens;
    return request;
  }
}
