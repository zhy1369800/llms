import { UnifiedChatRequest } from "../types/llm";
// import { configService } from "../services/config";
import { ProxyAgent } from "undici";
import { log } from "./log";

export function sendUnifiedRequest(
  url: URL | string,
  request: UnifiedChatRequest,
  config: any
): Promise<Response> {
  log('final request:', request)
  const headers = new Headers({
    "Content-Type": "application/json",
  });
  if (config.headers) {
    Object.entries(config.headers).forEach(([key, value]) => {
      headers.set(key, value as string);
    });
  }
  let combinedSignal: AbortSignal;
  const timeoutSignal = AbortSignal.timeout(config.TIMEOUT ?? 60 * 1000 * 60);

  if (config.signal) {
    const controller = new AbortController();
    const abortHandler = () => controller.abort();
    config.signal.addEventListener("abort", abortHandler);
    timeoutSignal.addEventListener("abort", abortHandler);
    combinedSignal = controller.signal;
  } else {
    combinedSignal = timeoutSignal;
  }

  const fetchOptions: RequestInit = {
    method: "POST",
    headers: headers,
    body: JSON.stringify(request),
    signal: combinedSignal,
  };
  // const httpsProxy = configService.getHttpsProxy();
  // if (httpsProxy && typeof global !== "undefined") {
  //   (fetchOptions as any).dispatcher = new ProxyAgent(
  //     new URL(httpsProxy).toString()
  //   );
  // }
  return fetch(
    typeof url === "string" ? url : url.toString(),
    fetchOptions
  );
}
