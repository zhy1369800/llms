import { LLMProvider, UnifiedChatRequest, UnifiedMessage } from "@/types/llm";
import { Transformer } from "@/types/transformer";

/**
 * Converts content from Claude Code format (array of objects) to plain string
 * @param content - The content to convert
 * @returns The converted string content
 */
function convertContentToString(content: any): string {
  if (typeof content === 'string') {
    return content;
  }
  
  if (Array.isArray(content)) {
    return content
      .map(item => {
        if (typeof item === 'string') {
          return item;
        }
        if (item.type === 'text' && item.text) {
          return item.text;
        }
        return '';
      })
      .join('');
  }
  
  return '';
}

/**
 * Transformer class for Cerebras
 */
export class CerebrasTransformer implements Transformer {
  name = "cerebras";
  endPoint = "/v1/chat/completions";

  /**
   * Transform the request from Claude Code format to Cerebras format
   * @param request - The incoming request
   * @param provider - The LLM provider information
   * @returns The transformed request
   */
  async transformRequestIn(
    request: UnifiedChatRequest,
    provider: LLMProvider
  ): Promise<Record<string, any>> {
    // Deep clone the request to avoid modifying the original
    const transformedRequest = JSON.parse(JSON.stringify(request));
    
    // Transform messages
    if (transformedRequest.messages && Array.isArray(transformedRequest.messages)) {
      transformedRequest.messages = transformedRequest.messages.map((message: UnifiedMessage) => {
        const transformedMessage: any = { ...message };
        
        // Convert content to string format
        if (message.content !== undefined) {
          transformedMessage.content = convertContentToString(message.content);
        }
        
        // Handle system messages specifically
        if (message.role === 'system' && message.content !== undefined) {
          transformedMessage.content = convertContentToString(message.content);
        }
        
        return transformedMessage;
      });
    }
    
    // Handle system field if it exists at the top level
    if (transformedRequest.system !== undefined) {
      transformedRequest.system = convertContentToString(transformedRequest.system);
    }
    
    return {
      body: transformedRequest,
      config: {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    };
  }

  /**
   * Transform the response
   * @param response - The response from Cerebras
   * @returns The transformed response
   */
  async transformResponseOut(response: Response): Promise<Response> {
    // Cerebras responses should be compatible with Claude Code
    // No transformation needed
    return response;
  }
}