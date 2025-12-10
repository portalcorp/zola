import { fetchClient } from "@/lib/fetch"
import { useModel } from "@/lib/model-store/provider"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

type RecentModelsResponse = {
  recent_models: string[]
}

export function useRecentModels() {
  const queryClient = useQueryClient()
  const { recentModels: initialRecentModels, refreshRecentModelsSilent } =
    useModel()

  // Ensure we always have an array
  const safeInitialData = Array.isArray(initialRecentModels)
    ? initialRecentModels
    : []

  // Query to fetch recent models
  const {
    data: recentModels = safeInitialData,
    isLoading,
    error,
  } = useQuery<string[]>({
    queryKey: ["recent-models"],
    queryFn: async () => {
      const response = await fetchClient(
        "/api/user-preferences/recent-models"
      )

      if (!response.ok) {
        throw new Error("Failed to fetch recent models")
      }

      const data: RecentModelsResponse = await response.json()
      return data.recent_models || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    initialData: safeInitialData,
  })

  // Mutation to add a model to recent
  const addRecentModelMutation = useMutation({
    mutationFn: async (modelId: string) => {
      const response = await fetchClient(
        "/api/user-preferences/recent-models",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model_id: modelId,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }))
        throw new Error(
          errorData.error ||
            `Failed to add recent model: ${response.statusText}`
        )
      }

      const result = await response.json()
      return result
    },
    onMutate: async (modelId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["recent-models"] })

      // Snapshot the previous value
      const previousRecentModels = queryClient.getQueryData<string[]>([
        "recent-models",
      ])

      // Optimistically update - add to front, remove duplicates, limit to 5
      const filtered = (previousRecentModels || []).filter(
        (id) => id !== modelId
      )
      const optimistic = [modelId, ...filtered].slice(0, 5)
      queryClient.setQueryData(["recent-models"], optimistic)

      // Return a context object with the snapshotted value
      return { previousRecentModels }
    },
    onError: (_error, _modelId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousRecentModels) {
        queryClient.setQueryData(
          ["recent-models"],
          context.previousRecentModels
        )
      }
    },
    onSuccess: () => {
      // Invalidate the cache to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ["recent-models"] })

      // Also refresh the ModelProvider's recent models (silently)
      refreshRecentModelsSilent()
    },
  })

  // Wrapper function to add a model to recent
  const addRecentModel = useCallback(
    (modelId: string) => {
      addRecentModelMutation.mutate(modelId)
    },
    [addRecentModelMutation]
  )

  return {
    recentModels,
    isLoading,
    error,
    addRecentModel,
    isUpdating: addRecentModelMutation.isPending,
    updateError: addRecentModelMutation.error,
  }
}
