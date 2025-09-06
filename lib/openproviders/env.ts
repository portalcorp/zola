// Core environment variables for known providers
export const env = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY!,
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY!,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
  XAI_API_KEY: process.env.XAI_API_KEY!,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY!,
}

// Get API key for any provider (known or dynamic)
export function getProviderApiKey(provider: string): string | undefined {
  // Check known providers first
  const knownKeys: Record<string, string | undefined> = {
    openai: env.OPENAI_API_KEY,
    mistral: env.MISTRAL_API_KEY,
    google: env.GOOGLE_GENERATIVE_AI_API_KEY,
    perplexity: env.PERPLEXITY_API_KEY,
    anthropic: env.ANTHROPIC_API_KEY,
    xai: env.XAI_API_KEY,
    openrouter: env.OPENROUTER_API_KEY,
  }

  if (provider in knownKeys) {
    return knownKeys[provider]
  }

  // For unknown providers, try to find env var dynamically
  return process.env[`${provider.toUpperCase()}_API_KEY`]
}

export function createEnvWithUserKeys(
  userKeys: Record<string, string> = {}
): typeof env & Record<string, string | undefined> {
  // Start with known providers
  const result: Record<string, string | undefined> = {
    OPENAI_API_KEY: userKeys.openai || env.OPENAI_API_KEY,
    MISTRAL_API_KEY: userKeys.mistral || env.MISTRAL_API_KEY,
    PERPLEXITY_API_KEY: userKeys.perplexity || env.PERPLEXITY_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY:
      userKeys.google || env.GOOGLE_GENERATIVE_AI_API_KEY,
    ANTHROPIC_API_KEY: userKeys.anthropic || env.ANTHROPIC_API_KEY,
    XAI_API_KEY: userKeys.xai || env.XAI_API_KEY,
    OPENROUTER_API_KEY: userKeys.openrouter || env.OPENROUTER_API_KEY,
  }

  // Add any additional user keys for dynamic providers
  for (const [provider, key] of Object.entries(userKeys)) {
    if (!(provider in result)) {
      result[`${provider.toUpperCase()}_API_KEY`] = key
    }
  }

  return result
}
