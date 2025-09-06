import { ModelConfig } from "./types"

export interface ModelsDevModel {
  id: string
  name: string
  attachment?: boolean
  reasoning?: boolean
  temperature?: boolean
  tool_call?: boolean
  knowledge?: string
  release_date?: string
  modalities?: {
    input?: string[]
    output?: string[]
  }
  open_weights?: boolean
  cost?: {
    input?: number
    output?: number
  }
  limit?: {
    context?: number
    output?: number
  }
}

export interface ModelsDevResponse {
  [provider: string]: {
    models?: {
      [modelId: string]: ModelsDevModel
    }
  }
}

const MODELS_DEV_API_URL = "https://models.dev/api.json"
const MODELS_DEV_LOGO_URL = "https://models.dev/logos"

// Provider mapping from models.dev to our internal provider IDs
const PROVIDER_ID_MAP: Record<string, string> = {
  deepseek: "deepseek",
  xai: "xai",
  openrouter: "openrouter",
  anthropic: "anthropic",
  openai: "openai",
  mistral: "mistral",
  google: "gemini",
  "google-vertex": "gemini",
  meta: "meta",
  perplexity: "perplexity",
  cerebras: "cerebras",
  fireworks: "fireworks",
  groq: "groq",
  together: "together",
  replicate: "replicate",
  cohere: "cohere",
}

// Map models.dev model to our ModelConfig
function mapModelToConfig(
  model: ModelsDevModel,
  provider: string
): ModelConfig | null {
  const providerId = PROVIDER_ID_MAP[provider.toLowerCase()] || provider.toLowerCase()
  
  // Skip if we don't support this provider
  if (!providerId) {
    return null
  }

  // Build tags based on capabilities
  const tags: string[] = []
  if (model.reasoning) tags.push("reasoning")
  if (model.tool_call) tags.push("tools")
  if (model.attachment) tags.push("vision", "file-upload")
  if (model.open_weights) tags.push("open-source", "OSS")
  if (model.cost?.input && model.cost.input < 1) tags.push("cheap")
  if (model.modalities?.input?.includes("image")) tags.push("vision")
  if (model.modalities?.input?.includes("audio")) tags.push("audio")
  if (model.limit?.context && model.limit.context >= 100000) tags.push("large-context")

  // Determine speed based on model characteristics
  let speed: "Fast" | "Medium" | "Slow" = "Medium"
  if (model.name.toLowerCase().includes("mini") || 
      model.name.toLowerCase().includes("nano") ||
      model.name.toLowerCase().includes("flash")) {
    speed = "Fast"
  } else if (model.name.toLowerCase().includes("pro") ||
             model.name.toLowerCase().includes("opus")) {
    speed = "Slow"
  }

  // Determine intelligence level
  let intelligence: "Low" | "Medium" | "High" = "Medium"
  if (model.reasoning) {
    intelligence = "High"
  } else if (model.name.toLowerCase().includes("mini") ||
             model.name.toLowerCase().includes("nano")) {
    intelligence = "Low"
  }

  // Create SDK function that will be called when needed
  const getApiSdk = async (apiKey?: string) => {
    try {
      // Dynamic import to avoid circular dependencies
      const { openproviders } = await import("@/lib/openproviders")
      // The openproviders function will handle routing to the correct provider
      // based on the model ID and our provider mapping
      return openproviders(model.id, undefined, apiKey)
    } catch (error) {
      console.warn(`Failed to create SDK for model ${model.id}:`, error)
      // Return undefined if SDK creation fails
      return undefined
    }
  }

  return {
    id: model.id,
    name: model.name,
    provider: provider.charAt(0).toUpperCase() + provider.slice(1),
    providerId,
    baseProviderId: providerId,
    description: `${model.name} model from ${provider}`,
    tags,
    contextWindow: model.limit?.context,
    inputCost: model.cost?.input,
    outputCost: model.cost?.output,
    priceUnit: "per 1M tokens",
    vision: model.attachment || model.modalities?.input?.includes("image"),
    tools: model.tool_call,
    audio: model.modalities?.input?.includes("audio"),
    reasoning: model.reasoning,
    openSource: model.open_weights,
    speed,
    intelligence,
    website: `https://models.dev`,
    releasedAt: model.release_date,
    icon: providerId,
    apiSdk: getApiSdk,
  }
}

// Fetch models from models.dev API
export async function fetchModelsFromModelsDev(): Promise<ModelConfig[]> {
  try {
    const response = await fetch(MODELS_DEV_API_URL, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`)
    }

    const data: ModelsDevResponse = await response.json()
    const models: ModelConfig[] = []

    // Process each provider and their models
    for (const [provider, providerData] of Object.entries(data)) {
      if (providerData.models) {
        for (const [, model] of Object.entries(providerData.models)) {
          const config = mapModelToConfig(model, provider)
          if (config) {
            models.push(config)
          }
        }
      }
    }

    return models
  } catch (error) {
    console.error("Error fetching models from models.dev:", error)
    return []
  }
}

// Get provider logo URL
export function getProviderLogoUrl(providerId: string): string {
  return `${MODELS_DEV_LOGO_URL}/${providerId}.svg`
}