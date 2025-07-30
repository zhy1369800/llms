import { UnifiedChatRequest } from "@/types/llm";
import { Transformer } from "@/types/transformer";
import { log } from "@/utils/log";

/**
 * AnthropicPassthroughTransformer
 * 
 * 这个 transformer 专门用于 Anthropic 官方 API 直通，不做任何格式转换
 * 直接将原始 Anthropic 请求透传到 Anthropic API 端点
 */
export class AnthropicPassthroughTransformer implements Transformer {
  name = "anthropicpassthrough";
  endPoint = "/v1/messages/passthrough";

  /**
   * transformRequestOut: 将 Anthropic 请求转换为统一格式（仅用于内部处理）
   * 由于是直通模式，这里主要是标记请求类型，实际不进行格式转换
   */
  async transformRequestOut(request: Record<string, any>): Promise<UnifiedChatRequest> {
    log("AnthropicPassthrough Request (no transformation):", JSON.stringify(request, null, 2));
    
    // 直接返回原始请求作为统一格式，添加直通标记
    return {
      ...request,
      _isPassthrough: true, // 内部标记，表示这是直通请求
    } as UnifiedChatRequest;
  }

  /**
   * transformRequestIn: 将统一格式转换为 Anthropic API 格式
   * 对于直通模式，直接返回原始请求
   */
  async transformRequestIn(request: UnifiedChatRequest): Promise<Record<string, any>> {
    log("AnthropicPassthrough transformRequestIn:", JSON.stringify(request, null, 2));
    
    // 移除内部标记，返回原始 Anthropic 格式的请求
    const { _isPassthrough, ...anthropicRequest } = request as any;
    return anthropicRequest;
  }

  /**
   * transformResponseIn: 处理 Anthropic API 响应
   * 对于直通模式，直接返回原始响应
   */
  async transformResponseIn(response: Response): Promise<Response> {
    log("AnthropicPassthrough Response (no transformation)");
    
    // 直接返回原始 Anthropic 响应，不做任何转换
    return response;
  }

  /**
   * transformResponseOut: 将 Anthropic 响应转换为统一格式
   * 对于直通模式，直接返回原始响应
   */
  async transformResponseOut(response: Response): Promise<Response> {
    log("AnthropicPassthrough transformResponseOut (no transformation)");
    
    // 直接返回原始响应
    return response;
  }
}