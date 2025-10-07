# 原生支持API协议的模型处理机制

## 1. 判断条件

当满足以下条件时，模型被认为是原生支持的，不需要进行转换：

1. Provider只使用一个transformer
2. 该transformer与当前处理请求的transformer是同一个
3. 对于特定模型，如果没有额外的transformer或只使用相同的transformer

判断逻辑在 `shouldBypassTransformers` 函数中实现：

```typescript
function shouldBypassTransformers(
  provider: any,
  transformer: any,
  body: any
): boolean {
  return (
    provider.transformer?.use?.length === 1 &&
    provider.transformer.use[0].name === transformer.name &&
    (!provider.transformer?.[body.model]?.use.length ||
      (provider.transformer?.[body.model]?.use.length === 1 &&
        provider.transformer?.[body.model]?.use[0].name === transformer.name))
  );
}
```

## 2. 处理流程

当 bypass 为 true 时：

1. **跳过所有转换器**：不执行任何请求或响应转换逻辑
2. **保留原始头部**：删除content-length头部，保留其他原始头部
3. **仅处理认证**：如果transformer有auth方法，则执行认证处理

```typescript
if (bypass) {
  if (headers instanceof Headers) {
    headers.delete("content-length");
  } else {
    delete headers["content-length"];
  }
  config.headers = headers;
}

// 跳过所有转换器处理
if (!bypass && typeof transformer.transformRequestOut === "function") {
  // 这些转换器逻辑不会执行
}

// 在发送请求前仅处理认证
if (bypass && typeof transformer.auth === "function") {
  const auth = await transformer.auth(requestBody, provider);
  // 处理认证逻辑
}
```

## 3. 配置示例

要配置一个原生支持的模型，可以这样设置：

```json
{
  "providers": [
    {
      "name": "openai",
      "api_base_url": "https://api.openai.com/v1",
      "api_key": "your-api-key",
      "models": ["gpt-3.5-turbo", "gpt-4"],
      "transformer": {
        "use": ["OpenAI"]
      }
    }
  ]
}
```

在这个配置中，如果使用OpenAI Transformer处理OpenAI模型的请求，就会触发bypass逻辑，直接透传请求和响应。

## 4. 实现细节

对于原生支持的模型：
- 请求体保持原样，不进行任何转换
- 响应体也保持原样，不进行任何转换
- 只处理必要的认证逻辑
- 保留原始HTTP头部（除了content-length）





  ✅ Modelscope模型请求及响应透传实现方案

  1. 🎯 配置要求
  确保配置文件中的provider配置正确：
  {
    "name": "modelscope",
    "api_base_url": "https://api-inference.modelscope.cn/v1/messages",
    "api_key": "your-api-key",
    "models": [
      "Qwen/Qwen3-235B-A22B-Thinking-2507",
      "Qwen/Qwen3-235B-A22B-Instruct-2507"
    ],
    "transformer": {
      "use": [
        "modelscope"
      ]
    }
  }
  2. 🛠️ ModelscopeTransformer实现
  已经在modelscope.transformer.ts中实现：
    - name = "modelscope" - 与配置中使用的名称一致
    - endPoint = "/v1/messages" - Modelscope API端点
    - auth方法 - 处理API密钥认证
  3. 🔍 透传机制工作原理
  当满足以下条件时自动触发透传：
    - Provider只使用一个transformer
    - 该transformer与当前处理请求的transformer相同
    - 对于特定模型，没有额外的transformer或只使用相同的transformer
  4. 🔄 透传处理流程
    - 请求阶段：
        i. 跳过所有转换器处理（bypass=true）
      ii. 保留原始HTTP头部（删除content-length）
      iii. 执行auth方法处理认证
      iv. 直接发送原始请求体到Modelscope API
    - 响应阶段：
        i. 跳过所有响应转换器处理
      ii. 直接返回Modelscope API的原始响应
  5. 🧪 验证方法
  发送如下请求测试透传：
  curl -X POST http://localhost:3000/v1/messages \
    -H "Content-Type: application/json" \
    -d '{
      "model": "modelscope,Qwen/Qwen3-235B-A22B-Thinking-2507",
      "messages": [
        {
          "role": "user",
          "content": "Hello, how are you?"
        }
      ]
    }'
  6. 📝 关键代码说明
    - shouldBypassTransformers函数判断是否触发透传
    - processRequestTransformers函数在bypass时跳过转换处理
    - sendRequestToProvider函数在bypass时仅执行auth方法
    - processResponseTransformers函数在bypass时跳过响应转换