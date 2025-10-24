import { anthropic, createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI, google } from "@ai-sdk/google"
import { createMistral, mistral } from "@ai-sdk/mistral"
import { createOpenAI, openai } from "@ai-sdk/openai"
import { createPerplexity, perplexity } from "@ai-sdk/perplexity"
import type { LanguageModelV2 } from "@ai-sdk/provider"
import { createXai, xai } from "@ai-sdk/xai"
import { getProviderForModel } from "./provider-map"
import type {
  AnthropicModel,
  GeminiModel,
  MistralModel,
  OllamaModel,
  OpenAIModel,
  PerplexityModel,
  SupportedModel,
  XaiModel,
} from "./types"

// In v5, provider settings are passed when creating the provider, not when calling it
type OpenAIChatSettings = Record<string, any>
type MistralProviderSettings = Record<string, any>
type GoogleGenerativeAIProviderSettings = Record<string, any>
type PerplexityProviderSettings = Record<string, any>
type AnthropicProviderSettings = Record<string, any>
type XaiProviderSettings = Record<string, any>
type OllamaProviderSettings = Record<string, any> // Ollama uses OpenAI-compatible API

type ModelSettings<T extends SupportedModel> = T extends OpenAIModel
  ? OpenAIChatSettings
  : T extends MistralModel
    ? MistralProviderSettings
    : T extends PerplexityModel
      ? PerplexityProviderSettings
      : T extends GeminiModel
        ? GoogleGenerativeAIProviderSettings
        : T extends AnthropicModel
          ? AnthropicProviderSettings
          : T extends XaiModel
            ? XaiProviderSettings
            : T extends OllamaModel
              ? OllamaProviderSettings
              : never

export type OpenProvidersOptions<T extends SupportedModel> = ModelSettings<T>

// Get Ollama base URL from environment or use default
const getOllamaBaseURL = () => {
  if (typeof window !== "undefined") {
    // Client-side: use localhost
    return "http://localhost:11434/v1"
  }

  // Server-side: check environment variables
  return (process.env.OLLAMA_BASE_URL?.replace(/\/+$/, "") + "/v1" || "http://localhost:11434/v1");
}

// Create Ollama provider instance with configurable baseURL
const createOllamaProvider = () => {
  return createOpenAI({
    baseURL: getOllamaBaseURL(),
    apiKey: "ollama", // Ollama doesn't require a real API key
    name: "ollama",
  })
}

// Create OpenRouter provider instance
const createOpenRouterProvider = (apiKey?: string) => {
  return createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey || process.env.OPENROUTER_API_KEY || "",
    name: "openrouter",
  })
}

// Create a generic provider using OpenRouter as a gateway
// This allows us to support any provider that OpenRouter supports
const createGenericProvider = (providerId: string, apiKey?: string) => {
  // Try to get API key from environment using the provider ID
  const envKey = process.env[`${providerId.toUpperCase()}_API_KEY`]
  
  // Use OpenRouter as a fallback gateway for unknown providers
  return createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey || envKey || process.env.OPENROUTER_API_KEY || "",
    name: providerId,
    headers: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Zola AI Chat",
    }
  })
}

// Map of provider IDs to their API base URLs (for providers with known endpoints)
const PROVIDER_ENDPOINTS: Record<string, string> = {
  deepseek: "https://api.deepseek.com/v1",
  together: "https://api.together.xyz/v1",
  groq: "https://api.groq.com/openai/v1",
  fireworks: "https://api.fireworks.ai/inference/v1",
  // Add more as needed - these use OpenAI-compatible APIs
}

// Create provider with known endpoint or fall back to OpenRouter
const createDynamicProvider = (providerId: string, apiKey?: string) => {
  const baseURL = PROVIDER_ENDPOINTS[providerId]
  const envKey = process.env[`${providerId.toUpperCase()}_API_KEY`]
  
  if (baseURL) {
    // Provider has a known direct endpoint
    return createOpenAI({
      baseURL,
      apiKey: apiKey || envKey || "",
      name: providerId,
    })
  } else {
    // Fall back to OpenRouter for unknown providers
    return createGenericProvider(providerId, apiKey)
  }
}

export function openproviders<T extends SupportedModel>(
  modelId: T,
  settings?: OpenProvidersOptions<T>,
  apiKey?: string
): LanguageModelV2 {
  const provider = getProviderForModel(modelId)

  if (provider === "openai") {
    if (apiKey) {
      const openaiProvider = createOpenAI({
        apiKey
      })
      return openaiProvider(modelId as OpenAIModel)
    }
    return openai(modelId as OpenAIModel)
  }

  if (provider === "mistral") {
    if (apiKey) {
      const mistralProvider = createMistral({ apiKey })
      return mistralProvider(modelId as MistralModel)
    }
    return mistral(modelId as MistralModel)
  }

  if (provider === "google") {
    if (apiKey) {
      const googleProvider = createGoogleGenerativeAI({ apiKey })
      return googleProvider(modelId as GeminiModel)
    }
    return google(modelId as GeminiModel)
  }

  if (provider === "perplexity") {
    if (apiKey) {
      const perplexityProvider = createPerplexity({ apiKey })
      return perplexityProvider(modelId as PerplexityModel)
    }
    return perplexity(modelId as PerplexityModel)
  }

  if (provider === "anthropic") {
    if (apiKey) {
      const anthropicProvider = createAnthropic({ apiKey })
      return anthropicProvider(modelId as AnthropicModel)
    }
    return anthropic(modelId as AnthropicModel)
  }

  if (provider === "xai") {
    if (apiKey) {
      const xaiProvider = createXai({ apiKey })
      return xaiProvider(modelId as XaiModel)
    }
    return xai(modelId as XaiModel)
  }

  if (provider === "ollama") {
    const ollamaProvider = createOllamaProvider()
    return ollamaProvider(modelId as OllamaModel)
  }

  if (provider === "openrouter") {
    const openrouterProvider = createOpenRouterProvider(apiKey)
    // Strip the "openrouter:" prefix if present
    const actualModelId = modelId.startsWith("openrouter:") 
      ? modelId.slice("openrouter:".length) 
      : modelId
    return openrouterProvider(actualModelId as string)
  }

  // Handle any other provider dynamically
  const dynamicProvider = createDynamicProvider(provider, apiKey)
  return dynamicProvider(modelId as string)
}
