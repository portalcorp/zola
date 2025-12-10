import { saveFinalAssistantMessage } from "@/app/api/chat/db"
import type {
  ChatApiParams,
  LogUserMessageParams,
  StoreAssistantMessageParams,
  SupabaseClientType,
} from "@/app/types/api.types"
import { FREE_MODELS_IDS, NON_AUTH_ALLOWED_MODELS, PRO_MODELS_IDS } from "@/lib/config"
import { getProviderForModel } from "@/lib/openproviders/provider-map"
import { sanitizeUserInput } from "@/lib/sanitize"
import { validateUserIdentity } from "@/lib/server/api"
import { checkUsageByModel, incrementUsage } from "@/lib/usage"
import { getEffectiveApiKey, type ProviderWithoutOllama } from "@/lib/user-keys"

export async function validateAndTrackUsage({
  userId,
  model,
  isAuthenticated,
}: ChatApiParams): Promise<SupabaseClientType | null> {
  const supabase = await validateUserIdentity(userId, isAuthenticated)
  if (!supabase) return null

  // Check if user is authenticated
  if (!isAuthenticated) {
    // For unauthenticated users, only allow specific models
    if (!NON_AUTH_ALLOWED_MODELS.includes(model)) {
      throw new Error(
        "This model requires authentication. Please sign in to access more models."
      )
    }
  } else {
    // For authenticated users, check if this is a PRO model
    const isPro = PRO_MODELS_IDS.includes(model)
    
    if (isPro) {
      // PRO models require either subscription or BYOK
      // Check if user has premium subscription
      const { data: userData } = await supabase
        .from("users")
        .select("premium")
        .eq("id", userId)
        .single()
      
      const isPremium = userData?.premium ?? false
      
      if (!isPremium) {
        // Check if user has BYOK enabled for this provider
        const provider = getProviderForModel(model)
        if (provider !== "ollama") {
          const effectiveKey = await getEffectiveApiKey(userId, provider as ProviderWithoutOllama)
          // For PRO models, we need to check if user specifically has BYOK enabled
          // getEffectiveApiKey returns platform key if user doesn't have BYOK, so we need
          // to check if user has their own key with use_for_chat enabled
          const { getUserKeyData } = await import("@/lib/user-keys")
          const userKeyData = await getUserKeyData(userId, provider)
          const hasUserByok = userKeyData && userKeyData.use_for_chat
          
          if (!hasUserByok) {
            throw new Error(
              `This is a PRO model. Please subscribe to PRO or add your own API key for ${provider} in Settings → API Keys.`
            )
          }
        }
      }
    }
    
    // For non-PRO models (or if PRO check passed), verify an API key exists
    const provider = getProviderForModel(model)
    if (provider !== "ollama") {
      const effectiveKey = await getEffectiveApiKey(userId, provider as ProviderWithoutOllama)
      
      // If no API key available (neither user BYOK nor platform .env), deny access
      if (!effectiveKey) {
        throw new Error(
          `No API key available for ${provider}. Please add your API key in Settings → API Keys.`
        )
      }
    }
  }

  // Check usage limits for the model
  await checkUsageByModel(supabase, userId, model, isAuthenticated)

  return supabase
}

export async function incrementMessageCount({
  supabase,
  userId,
}: {
  supabase: SupabaseClientType
  userId: string
}): Promise<void> {
  if (!supabase) return

  try {
    await incrementUsage(supabase, userId)
  } catch (err) {
    console.error("Failed to increment message count:", err)
    // Don't throw error as this shouldn't block the chat
  }
}

export async function logUserMessage({
  supabase,
  userId,
  chatId,
  content,
  attachments,
  model,
  isAuthenticated,
  message_group_id,
}: LogUserMessageParams): Promise<void> {
  if (!supabase) return

  /* FIXME(@ai-sdk-upgrade-v5): The `experimental_attachments` property has been replaced with the parts array. Please manually migrate following https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#attachments--file-parts */
  const { error } = await supabase.from("messages").insert({
    chat_id: chatId,
    role: "user",
    content: sanitizeUserInput(content),
    experimental_attachments: attachments,
    user_id: userId,
    message_group_id,
  });

  if (error) {
    console.error("Error saving user message:", error)
  }
}

export async function storeAssistantMessage({
  supabase,
  chatId,
  messages,
  message_group_id,
  model,
}: StoreAssistantMessageParams): Promise<void> {
  if (!supabase) return
  try {
    await saveFinalAssistantMessage(
      supabase,
      chatId,
      messages,
      message_group_id,
      model
    )
  } catch (err) {
    console.error("Failed to save assistant messages:", err)
  }
}
