import { FREE_MODELS_IDS, RECOMMENDED_MODELS_IDS } from "@/lib/config"
import { ModelConfig } from "@/lib/models/types"

export type ModelSection = {
  title: string
  models: ModelConfig[]
}

/**
 * Utility function to filter and sort models based on favorites, search, and visibility
 * @param models - All available models
 * @param favoriteModels - Array of favorite model IDs
 * @param searchQuery - Search query to filter by model name
 * @param isModelHidden - Function to check if a model is hidden
 * @returns Filtered and sorted models
 */
export function filterAndSortModels(
  models: ModelConfig[],
  favoriteModels: string[],
  searchQuery: string,
  isModelHidden: (modelId: string) => boolean
): ModelConfig[] {
  return models
    .filter((model) => !isModelHidden(model.id))
    .filter((model) => {
      // If user has favorite models, only show favorites
      if (favoriteModels && favoriteModels.length > 0) {
        return favoriteModels.includes(model.id)
      }
      // If no favorites, show all models
      return true
    })
    .filter((model) =>
      model.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      // If user has favorite models, maintain their order
      if (favoriteModels && favoriteModels.length > 0) {
        const aIndex = favoriteModels.indexOf(a.id)
        const bIndex = favoriteModels.indexOf(b.id)
        return aIndex - bIndex
      }

      // Fallback to original sorting (free models first)
      const aIsFree = FREE_MODELS_IDS.includes(a.id)
      const bIsFree = FREE_MODELS_IDS.includes(b.id)
      return aIsFree === bIsFree ? 0 : aIsFree ? -1 : 1
    })
}

/**
 * Get models organized into sections: Favorites, Recent, Recommended
 * Handles deduplication - a model won't appear in multiple sections
 * @param models - All available models
 * @param favoriteModels - Array of favorite model IDs (in order)
 * @param recentModels - Array of recently used model IDs (in order, most recent first)
 * @param searchQuery - Search query to filter by model name
 * @param isModelHidden - Function to check if a model is hidden
 * @returns Object with separate arrays for each section
 */
export function getModelSections(
  models: ModelConfig[],
  favoriteModels: string[],
  recentModels: string[],
  searchQuery: string,
  isModelHidden: (modelId: string) => boolean
): { favorites: ModelConfig[]; recent: ModelConfig[]; recommended: ModelConfig[] } {
  // Filter models by search query and visibility
  const visibleModels = models.filter(
    (model) =>
      !isModelHidden(model.id) &&
      model.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Create a map for quick lookup
  const modelMap = new Map(visibleModels.map((m) => [m.id, m]))

  // Track which models have been assigned to a section
  const usedModelIds = new Set<string>()

  // Get favorite models in order
  const favorites: ModelConfig[] = []
  for (const id of favoriteModels) {
    const model = modelMap.get(id)
    if (model) {
      favorites.push(model)
      usedModelIds.add(id)
    }
  }

  // Get recent models in order (excluding those already in favorites)
  const recent: ModelConfig[] = []
  for (const id of recentModels) {
    if (usedModelIds.has(id)) continue
    const model = modelMap.get(id)
    if (model) {
      recent.push(model)
      usedModelIds.add(id)
    }
  }

  // Get recommended models (excluding those already in favorites or recent)
  const recommended: ModelConfig[] = []
  for (const id of RECOMMENDED_MODELS_IDS) {
    if (usedModelIds.has(id)) continue
    const model = modelMap.get(id)
    if (model) {
      recommended.push(model)
      usedModelIds.add(id)
    }
  }

  return { favorites, recent, recommended }
}

/**
 * Get recommended models that aren't already favorites
 * @param models - All available models
 * @param favoriteModels - Array of favorite model IDs
 * @param isModelHidden - Function to check if a model is hidden
 * @returns Array of recommended models
 */
export function getRecommendedModels(
  models: ModelConfig[],
  favoriteModels: string[],
  isModelHidden: (modelId: string) => boolean
): ModelConfig[] {
  const favoriteSet = new Set(favoriteModels)
  
  return RECOMMENDED_MODELS_IDS
    .filter((id) => !favoriteSet.has(id) && !isModelHidden(id))
    .map((id) => models.find((m) => m.id === id))
    .filter((model): model is ModelConfig => model !== undefined)
}
