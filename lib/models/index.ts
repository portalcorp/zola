import { FREE_MODELS_IDS } from "../config"
import { claudeModels } from "./data/claude"
import { deepseekModels } from "./data/deepseek"
import { geminiModels } from "./data/gemini"
import { grokModels } from "./data/grok"
import { mistralModels } from "./data/mistral"
import { getOllamaModels, ollamaModels } from "./data/ollama"
import { openaiModels } from "./data/openai"
import { openrouterModels } from "./data/openrouter"
import { perplexityModels } from "./data/perplexity"
import { fetchModelsFromModelsDev } from "./models-dev-fetcher"
import { ModelConfig } from "./types"

// Static models (always available) - kept as fallback
const STATIC_MODELS: ModelConfig[] = [
  ...openaiModels,
  ...mistralModels,
  ...deepseekModels,
  ...claudeModels,
  ...grokModels,
  ...perplexityModels,
  ...geminiModels,
  ...ollamaModels, // Static fallback Ollama models
  ...openrouterModels,
]

// Dynamic models cache
let dynamicModelsCache: ModelConfig[] | null = null
let modelsDevCache: ModelConfig[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// // Function to get all models including dynamically detected ones
export async function getAllModels(): Promise<ModelConfig[]> {
  const now = Date.now()

  // Use cache if it's still valid
  if (dynamicModelsCache && now - lastFetchTime < CACHE_DURATION) {
    return dynamicModelsCache
  }

  try {
    // Fetch models from multiple sources in parallel
    const [modelsDevModels, detectedOllamaModels] = await Promise.all([
      // Fetch from models.dev API
      fetchModelsFromModelsDev().catch((error) => {
        console.warn("Failed to fetch from models.dev, using static models:", error)
        return []
      }),
      // Get dynamically detected Ollama models (includes enabled check internally)
      getOllamaModels().catch((error) => {
        console.warn("Failed to detect Ollama models:", error)
        return []
      })
    ])

    // Store models.dev cache
    modelsDevCache = modelsDevModels

    // Create a map to deduplicate models by ID
    const modelMap = new Map<string, ModelConfig>()

    // Priority order: models.dev > static models > ollama
    // First add models from models.dev
    for (const model of modelsDevModels) {
      modelMap.set(model.id, model)
    }

    // Then add static models (won't override models.dev entries)
    for (const model of STATIC_MODELS) {
      if (!modelMap.has(model.id) && model.providerId !== "ollama") {
        modelMap.set(model.id, model)
      }
    }

    // Finally add Ollama models
    for (const model of detectedOllamaModels) {
      if (!modelMap.has(model.id)) {
        modelMap.set(model.id, model)
      }
    }

    dynamicModelsCache = Array.from(modelMap.values())
    lastFetchTime = now
    return dynamicModelsCache
  } catch (error) {
    console.warn("Failed to load dynamic models, using static models:", error)
    return STATIC_MODELS
  }
}

export async function getModelsWithAccessFlags(): Promise<ModelConfig[]> {
  const models = await getAllModels()

  const freeModels = models
    .filter(
      (model) =>
        FREE_MODELS_IDS.includes(model.id) || model.providerId === "ollama"
    )
    .map((model) => ({
      ...model,
      accessible: true,
    }))

  const proModels = models
    .filter((model) => !freeModels.map((m) => m.id).includes(model.id))
    .map((model) => ({
      ...model,
      accessible: false,
    }))

  return [...freeModels, ...proModels]
}

export async function getModelsForProvider(
  provider: string
): Promise<ModelConfig[]> {
  const models = STATIC_MODELS

  const providerModels = models
    .filter((model) => model.providerId === provider)
    .map((model) => ({
      ...model,
      accessible: true,
    }))

  return providerModels
}

// Function to get models based on user's available providers
export async function getModelsForUserProviders(
  providers: string[]
): Promise<ModelConfig[]> {
  const providerModels = await Promise.all(
    providers.map((provider) => getModelsForProvider(provider))
  )

  const flatProviderModels = providerModels.flat()

  return flatProviderModels
}

// Synchronous function to get model info for simple lookups
// This uses cached data if available, otherwise falls back to static models
export function getModelInfo(modelId: string): ModelConfig | undefined {
  // First check the dynamic cache if it exists
  if (dynamicModelsCache) {
    return dynamicModelsCache.find((model) => model.id === modelId)
  }

  // Then check models.dev cache
  if (modelsDevCache) {
    const modelsDevModel = modelsDevCache.find((model) => model.id === modelId)
    if (modelsDevModel) return modelsDevModel
  }

  // Fall back to static models for immediate lookup
  return STATIC_MODELS.find((model) => model.id === modelId)
}

// For backward compatibility - static models only
export const MODELS: ModelConfig[] = STATIC_MODELS

// Function to refresh the models cache
export function refreshModelsCache(): void {
  dynamicModelsCache = null
  lastFetchTime = 0
}
