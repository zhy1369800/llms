import type {
  ChatCompletion,
  ChatCompletionChunk,
} from "openai/resources/chat/completions";
import type { Message } from "@anthropic-ai/sdk/resources/messages";
import { ProviderService } from "./provider";
import { convertRequest } from "../utils/converter";
import {
  LLMProvider,
  RegisterProviderRequest,
  RequestRouteInfo,
  UnifiedChatRequest,
  UnifiedTool,
} from "../types/llm";
import { log } from "../utils/log";
import { sendUnifiedRequest } from "../utils/request";

export class LLMService {
  constructor(private readonly providerService: ProviderService) {
  }

  registerProvider(request: RegisterProviderRequest): LLMProvider {
    return this.providerService.registerProvider(request);
  }

  getProviders(): LLMProvider[] {
    return this.providerService.getProviders();
  }

  getProvider(id: string): LLMProvider | undefined {
    return this.providerService.getProvider(id);
  }

  updateProvider(
    id: string,
    updates: Partial<LLMProvider>
  ): LLMProvider | null {
    const result = this.providerService.updateProvider(id, updates);
    return result;
  }

  deleteProvider(id: string): boolean {
    const result = this.providerService.deleteProvider(id);
    return result;
  }

  toggleProvider(id: string, enabled: boolean): boolean {
    return this.providerService.toggleProvider(id, enabled);
  }

  private resolveRoute(modelName: string): RequestRouteInfo {
    const route = this.providerService.resolveModelRoute(modelName);
    if (!route) {
      throw new Error(
        `Model ${modelName} not found. Available models: ${this.getAvailableModelNames().join(
          ", "
        )}`
      );
    }
    return route;
  }

  async handleOpenAIFormatRequest(
    requestBody: any,
    signal?: AbortSignal
  ): Promise<Response> {
    try {
      this.validateRequest(requestBody);
      const modelName = requestBody.model;
      const route = this.resolveRoute(modelName);
      const { provider, targetModel } = route;
      const unifiedReq = this.convertOpenAIToUnified(requestBody);
      unifiedReq.model = targetModel;
      let providerRequest: any;
      if (provider.type === "anthropic") {
        providerRequest = convertRequest(unifiedReq, {
          sourceProvider: "openai",
          targetProvider: "anthropic",
        });
      } else {
        providerRequest = unifiedReq;
      }
      if (signal?.aborted) {
        throw new Error("Request was aborted");
      }
      const response = await sendUnifiedRequest(
        this.getProvider(provider.id)!,
        providerRequest,
        { signal }
      );
      if (signal?.aborted) {
        throw new Error("Request was aborted");
      }

      const isStream = requestBody.stream === true;
      if (provider.type === "anthropic") {
        if (isStream) {
          if (!response.body) {
            throw new Error("Stream response body is null");
          }
          const convertedStream = await this.convertAnthropicStreamToOpenAI(
            response.body
          );
          return new Response(convertedStream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        } else {
          const data = await response.json();
          const openaiResponse = this.convertAnthropicResponseToOpenAI(data);
          return new Response(JSON.stringify(openaiResponse), {
            headers: { "Content-Type": "application/json" },
          });
        }
      } else {
        return response;
      }
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("aborted") || error.name === "AbortError")
      ) {
        throw error;
      }

      if (requestBody?.stream) {
        const errorStream = this.createOpenAIErrorStream(error as Error);
        return new Response(errorStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      } else {
        throw error;
      }
    }
  }

  private convertAnthropicResponseToOpenAI(
    anthropicResponse: Message
  ): ChatCompletion {
    const textContent = anthropicResponse.content.find(
      (content: any) => content.type === "text"
    ) as any;
    const toolUseContent = anthropicResponse.content.filter(
      (content: any) => content.type === "tool_use"
    );

    // 构建tool_calls
    const tool_calls = toolUseContent.map((toolUse: any, index: number) => ({
      id: toolUse.id || `call_${Date.now()}_${index}`,
      type: "function" as const,
      function: {
        name: toolUse.name,
        arguments: JSON.stringify(toolUse.input || {}),
      },
    }));

    return {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: anthropicResponse.model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: textContent?.text || null,
            refusal: null,
            tool_calls: tool_calls.length > 0 ? tool_calls : undefined,
          },
          logprobs: null,
          finish_reason:
            anthropicResponse.stop_reason === "end_turn"
              ? "stop"
              : anthropicResponse.stop_reason === "max_tokens"
              ? "length"
              : anthropicResponse.stop_reason === "tool_use"
              ? "tool_calls"
              : anthropicResponse.stop_reason === "stop_sequence"
              ? "stop"
              : "stop",
        },
      ],
      usage: {
        prompt_tokens: anthropicResponse.usage.input_tokens,
        completion_tokens: anthropicResponse.usage.output_tokens,
        total_tokens:
          anthropicResponse.usage.input_tokens +
          anthropicResponse.usage.output_tokens,
      },
    };
  }


  private createOpenAIErrorStream(error: Error): ReadableStream {
    return new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const errorChunk = {
          id: `chatcmpl-error-${Date.now()}`,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: "error",
          choices: [
            {
              index: 0,
              delta: { content: `Error: ${error.message}` },
              logprobs: null,
              finish_reason: "stop",
            },
          ],
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`)
        );
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });
  }

  private validateRequest(requestBody: any): void {
    if (!requestBody) {
      throw new Error("Request body is required");
    }

    if (!requestBody.model) {
      throw new Error("Model is required in request body");
    }

    if (!requestBody.messages || !Array.isArray(requestBody.messages)) {
      throw new Error("Messages array is required in request body");
    }

    if (requestBody.messages.length === 0) {
      throw new Error("At least one message is required");
    }
  }

  private convertOpenAIToUnified(openaiRequest: any): UnifiedChatRequest {
    return {
      messages: openaiRequest.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        tool_calls: msg.tool_calls,
        tool_call_id: msg.tool_call_id,
      })),
      model: openaiRequest.model,
      max_tokens: openaiRequest.max_tokens,
      temperature: openaiRequest.temperature,
      stream: openaiRequest.stream,
      tools: openaiRequest.tools
        ? this.convertOpenAIToolsToUnified(openaiRequest.tools)
        : undefined,
      tool_choice: openaiRequest.tool_choice,
    };
  }

  private convertOpenAIToolsToUnified(tools: any[]): UnifiedTool[] {
    return tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.function.name,
        description: tool.function.description || "",
        parameters: tool.function.parameters,
      },
    }));
  }

  async getAvailableModels(): Promise<any> {
    const providers = this.providerService.getAvailableModels();

    return {
      object: "list",
      data: providers.flatMap((provider) =>
        provider.models.map((model) => ({
          id: model,
          object: "model",
          provider: provider.provider,
          created: Math.floor(Date.now() / 1000),
          owned_by: provider.provider,
        }))
      ),
    };
  }

  private getAvailableModelNames(): string[] {
    return this.providerService
      .getModelRoutes()
      .map((route) => route.fullModel);
  }

  getModelRoutes() {
    return this.providerService.getModelRoutes();
  }
}
