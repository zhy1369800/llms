import { UnifiedChatRequest } from "@/types/llm";
import { Transformer } from "@/types/transformer";
import { log } from "@/utils/log";

/**
 * AnthropicPassthroughTransformer
 * 
 * 这个 transformer 专门用于 Anthropic 官方 API 直通，不做任何格式转换
 * 直接将原始 Anthropic 请求透传到 Anthropic API 端点
 * 特殊标记：isPassthrough = true 表示跳过所有其他 transformer 处理
 */
export class AnthropicPassthroughTransformer implements Transformer {
  name = "anthropicpassthrough";
  endPoint = "/v1/messages/passthrough";
  isPassthrough = true; // 特殊标记，用于在 routes.ts 中识别需要直通处理

  /**
   * transformRequestOut: 标记为直通请求，不做任何转换
   */
  async transformRequestOut(request: Record<string, any>): Promise<UnifiedChatRequest> {
    log("AnthropicPassthrough: Marking request for direct passthrough", JSON.stringify(request, null, 2));

    // 直接返回原始请求，添加直通标记
    return {
      ...request,
      _isPassthrough: true,
    } as UnifiedChatRequest;
  }

  /**
   * transformRequestIn: 直通模式下不应该被调用
   */
  async transformRequestIn(request: UnifiedChatRequest): Promise<Record<string, any>> {
    log("AnthropicPassthrough transformRequestIn: This should not be called in passthrough mode");
    const { _isPassthrough, ...anthropicRequest } = request as any;
    return anthropicRequest;
  }

  /**
   * transformResponseIn: 直通模式下不应该被调用
   */
  async transformResponseIn(response: Response): Promise<Response> {
    log("AnthropicPassthrough transformResponseIn: This should not be called in passthrough mode");
    return response;
  }

  /**
   * transformResponseOut: 直通模式下不应该被调用
   */
  async transformResponseOut(response: Response): Promise<Response> {
    log("AnthropicPassthrough transformResponseOut: This should not be called in passthrough mode");
    return response;
  }
}