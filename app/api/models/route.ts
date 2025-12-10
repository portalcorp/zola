import { PRO_MODELS_IDS } from "@/lib/config"
import {
  getAllModels,
  getModelsWithAccessFlags,
  refreshModelsCache,
} from "@/lib/models"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    if (!supabase) {
      // No supabase = self-hosted, all models accessible
      const allModels = await getAllModels()
      const models = allModels.map((model) => ({
        ...model,
        accessible: true,
        isPro: PRO_MODELS_IDS.includes(model.id),
      }))
      return new Response(JSON.stringify({ models }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    const { data: authData } = await supabase.auth.getUser()

    if (!authData?.user?.id) {
      // Not authenticated = only free models accessible
      const models = await getModelsWithAccessFlags()
      // Also mark PRO models
      const modelsWithPro = models.map((model) => ({
        ...model,
        isPro: PRO_MODELS_IDS.includes(model.id),
      }))
      return new Response(JSON.stringify({ models: modelsWithPro }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    // Get user's subscription status and BYOK settings
    const [userResult, userKeysResult] = await Promise.all([
      supabase
        .from("users")
        .select("premium")
        .eq("id", authData.user.id)
        .single(),
      supabase
        .from("user_keys")
        .select("provider, use_for_chat")
        .eq("user_id", authData.user.id),
    ])

    const isPremium = userResult.data?.premium ?? false
    const userKeys = userKeysResult.data || []

    // Build a map of providers where user has BYOK enabled
    const byokProviders = new Set<string>()
    userKeys.forEach((key) => {
      if (key.use_for_chat) {
        byokProviders.add(key.provider)
      }
    })

    const allModels = await getAllModels()

    // Determine accessibility for each model
    const models = allModels.map((model) => {
      const isPro = PRO_MODELS_IDS.includes(model.id)

      // For PRO models: accessible only if user is premium OR has BYOK enabled for this provider
      // For non-PRO models: always accessible for authenticated users
      let accessible = true
      if (isPro) {
        const hasByokForProvider = byokProviders.has(model.providerId)
        accessible = isPremium || hasByokForProvider
      }

      return {
        ...model,
        accessible,
        isPro,
      }
    })

    return new Response(JSON.stringify({ models }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("Error fetching models:", error)
    return new Response(JSON.stringify({ error: "Failed to fetch models" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }
}

export async function POST() {
  try {
    refreshModelsCache()
    const models = await getAllModels()

    return NextResponse.json({
      message: "Models cache refreshed",
      models,
      timestamp: new Date().toISOString(),
      count: models.length,
    })
  } catch (error) {
    console.error("Failed to refresh models:", error)
    return NextResponse.json(
      { error: "Failed to refresh models" },
      { status: 500 }
    )
  }
}
