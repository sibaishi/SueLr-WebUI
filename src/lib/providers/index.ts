// ====== 向后兼容：原有的函数式调用（内部使用默认配置） ======
export { chatCompletion, submitVideoGeneration, listModels, tavilySearch } from './openai';

// ====== 新增：Provider 接口和工厂函数 ======
export { createProvider } from './generic';
export { DEFAULT_PROVIDER_CONFIG } from './types';
export type { AIProvider, ProviderConfig, ChatCompletionParams, ChatCompletionResult, VideoSubmitParams, VideoSubmitResult, SearchResult, GenerateImageParams, GenerateImageResult } from './types';
