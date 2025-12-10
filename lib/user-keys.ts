import { decryptKey } from "./encryption"
import { env } from "./openproviders/env"
import { Provider } from "./openproviders/types"
import { createClient } from "./supabase/server"

export type { Provider } from "./openproviders/types"
export type ProviderWithoutOllama = Exclude<Provider, "ollama">

type UserKeyData = {
  encrypted_key: string
  iv: string
  use_for_chat: boolean | null
}

export async function getUserKeyData(
  userId: string,
  provider: Provider
): Promise<UserKeyData | null> {
  try {
    const supabase = await createClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from("user_keys")
      .select("encrypted_key, iv, use_for_chat")
      .eq("user_id", userId)
      .eq("provider", provider)
      .single()

    if (error || !data) return null

    return data as UserKeyData
  } catch (error) {
    console.error("Error retrieving user key:", error)
    return null
  }
}

export async function getUserKey(
  userId: string,
  provider: Provider
): Promise<string | null> {
  const keyData = await getUserKeyData(userId, provider)
  if (!keyData) return null
  return decryptKey(keyData.encrypted_key, keyData.iv)
}

/**
 * Get the effective API key to use for a provider.
 * 
 * Logic:
 * 1. If user has a key AND has enabled "use_for_chat" for this provider -> use user's key
 * 2. Otherwise -> use platform's .env key
 * 
 * This allows users to store their API keys for backup/reference without
 * necessarily using them for every chat.
 */
export async function getEffectiveApiKey(
  userId: string | null,
  provider: ProviderWithoutOllama
): Promise<string | null> {
  // Check if user has a key and wants to use it
  if (userId) {
    const keyData = await getUserKeyData(userId, provider)
    if (keyData && keyData.use_for_chat) {
      // User has a key and has enabled "use for chat"
      return decryptKey(keyData.encrypted_key, keyData.iv)
    }
  }

  // Use platform's .env key (default behavior)
  // Try to get API key from environment dynamically
  // First check if it's a known provider with a specific env var
  const knownProviderKeys: Record<string, string | undefined> = {
    openai: env.OPENAI_API_KEY,
    mistral: env.MISTRAL_API_KEY,
    perplexity: env.PERPLEXITY_API_KEY,
    google: env.GOOGLE_GENERATIVE_AI_API_KEY,
    anthropic: env.ANTHROPIC_API_KEY,
    xai: env.XAI_API_KEY,
    openrouter: env.OPENROUTER_API_KEY,
  }

  if (provider in knownProviderKeys) {
    return knownProviderKeys[provider] || null
  }

  // For unknown providers, try to find an env var following the pattern PROVIDER_API_KEY
  const envKey = process.env[`${provider.toUpperCase()}_API_KEY`]
  if (envKey) return envKey

  // Fall back to OpenRouter API key for unknown providers
  return env.OPENROUTER_API_KEY || null
}
