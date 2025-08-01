import { log } from "./log";
import { UnifiedChatRequest, UnifiedMessage } from "../types/llm";

// Vertex Claude消息接口
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: Array<{
    type: 'text' | 'image';
    text?: string;
    source?: {
      type: 'base64';
      media_type: string;
      data: string;
    };
  }>;
}

// Vertex Claude请求接口
interface VertexClaudeRequest {
  anthropic_version: 'vertex-2023-10-16';
  messages: ClaudeMessage[];
  max_tokens: number;
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  top_k?: number;
}

// Vertex Claude响应接口
interface VertexClaudeResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  id: string;
  model: string;
  role: 'assistant';
  stop_reason: string;
  stop_sequence: null;
  type: 'message';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export function buildRequestBody(request: UnifiedChatRequest): VertexClaudeRequest {
  const messages: ClaudeMessage[] = request.messages.map((message: UnifiedMessage) => {
    const content: ClaudeMessage['content'] = [];
    
    if (typeof message.content === 'string') {
      content.push({
        type: 'text',
        text: message.content
      });
    } else if (Array.isArray(message.content)) {
      message.content.forEach((item) => {
        if (item.type === 'text') {
          content.push({
            type: 'text',
            text: item.text
          });
        } else if (item.type === 'image_url') {
          // 处理图片内容
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: item.media_type || 'image/jpeg',
              data: item.image_url.url
            }
          });
        }
      });
    }

    return {
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content
    };
  });

  return {
    anthropic_version: 'vertex-2023-10-16',
    messages,
    max_tokens: request.max_tokens || 1000,
    stream: request.stream || false,
    ...(request.temperature && { temperature: request.temperature }),
    // 可以添加更多参数如top_p, top_k等
  };
}

export function transformRequestOut(request: Record<string, any>): UnifiedChatRequest {
  const vertexRequest = request as VertexClaudeRequest;
  
  const messages: UnifiedMessage[] = vertexRequest.messages.map((msg) => {
    const content = msg.content.map((item) => {
      if (item.type === 'text') {
        return {
          type: 'text' as const,
          text: item.text || ''
        };
      } else if (item.type === 'image' && item.source) {
        return {
          type: 'image_url' as const,
          image_url: {
            url: item.source.data
          },
          media_type: item.source.media_type
        };
      }
      return {
        type: 'text' as const,
        text: ''
      };
    });

    return {
      role: msg.role,
      content
    };
  });

  return {
    messages,
    model: request.model || 'claude-sonnet-4@20250514',
    max_tokens: vertexRequest.max_tokens,
    temperature: vertexRequest.temperature,
    stream: vertexRequest.stream
  };
}

export async function transformResponseOut(response: Response, providerName: string): Promise<Response> {
  if (response.headers.get("Content-Type")?.includes("application/json")) {
    const jsonResponse = await response.json() as VertexClaudeResponse;
    
    // 转换为OpenAI格式的响应
    const res = {
      id: jsonResponse.id,
      choices: [
        {
          finish_reason: jsonResponse.stop_reason || null,
          index: 0,
          message: {
            content: jsonResponse.content[0]?.text || '',
            role: "assistant",
          },
        },
      ],
      created: parseInt(new Date().getTime() / 1000 + "", 10),
      model: jsonResponse.model,
      object: "chat.completion",
      usage: {
        completion_tokens: jsonResponse.usage.output_tokens,
        prompt_tokens: jsonResponse.usage.input_tokens,
        total_tokens: jsonResponse.usage.input_tokens + jsonResponse.usage.output_tokens,
      },
    };
    
    return new Response(JSON.stringify(res), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } else if (response.headers.get("Content-Type")?.includes("stream")) {
    // 处理流式响应
    if (!response.body) {
      return response;
    }

    const decoder = new TextDecoder();
    const encoder = new TextEncoder();

    const processLine = (
      line: string,
      controller: ReadableStreamDefaultController
    ) => {
      if (line.startsWith("data: ")) {
        const chunkStr = line.slice(6).trim();
        if (chunkStr) {
          log(`${providerName} chunk:`, chunkStr);
          try {
            const chunk = JSON.parse(chunkStr);
            const res = {
              choices: [
                {
                  delta: {
                    role: "assistant",
                    content: chunk.content?.[0]?.text || '',
                  },
                  finish_reason: chunk.stop_reason?.toLowerCase() || null,
                  index: 0,
                  logprobs: null,
                },
              ],
              created: parseInt(new Date().getTime() / 1000 + "", 10),
              id: chunk.id || "",
              model: chunk.model || "",
              object: "chat.completion.chunk",
              system_fingerprint: "fp_a49d71b8a1",
              usage: {
                completion_tokens: chunk.usage?.output_tokens || 0,
                prompt_tokens: chunk.usage?.input_tokens || 0,
                total_tokens: (chunk.usage?.input_tokens || 0) + (chunk.usage?.output_tokens || 0),
              },
            };
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(res)}\n\n`)
            );
          } catch (error: any) {
            log(`Error parsing ${providerName} stream chunk`, chunkStr, error.message);
          }
        }
      }
    };

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              if (buffer) {
                processLine(buffer, controller);
              }
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");

            buffer = lines.pop() || "";

            for (const line of lines) {
              processLine(line, controller);
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
  return response;
} 