import { UnifiedChatRequest } from "@/types/llm";
import { Transformer } from "@/types/transformer";
import { log } from "@/utils/log";

/**
 * AnthropicPassthroughTransformer
 * 
 * 这个 transformer 专门用于自动启用 Anthropic 直通模式
 * 它会自动给请求添加 passthrough 标记，无需用户手动设置
 * 
 * 使用场景：
 * - 当你想要所有请求都直通到 Anthropic API 时
 * - 不需要格式转换，直接使用原生 Anthropic 格式
 */
export class AnthropicPassthroughTransformer implements Transformer {
    name = "anthropicPassthrough";
    // 注意：这个 transformer 没有 endPoint，它是作为 provider transformer 使用的

    /**
     * transformRequestIn: 自动添加 passthrough 标记
     */
    async transformRequestIn(request: UnifiedChatRequest): Promise<UnifiedChatRequest> {
        log("AnthropicPassthrough: Adding passthrough marker to request");

        return {
            ...request,
            passthrough: true,
        } as UnifiedChatRequest;
    }

    /**
     * 其他方法保持默认行为（不做任何处理）
     */
    async transformRequestOut(request: Record<string, any>): Promise<UnifiedChatRequest> {
        return request as UnifiedChatRequest;
    }

    async transformResponseIn(response: Response): Promise<Response> {
        return response;
    }

    async transformResponseOut(response: Response): Promise<Response> {
        return response;
    }
} 