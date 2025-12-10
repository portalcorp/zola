import { PROVIDERS } from "@/lib/providers"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SUPPORTED_PROVIDERS = PROVIDERS.map((p) => p.id)

export type ProviderKeyStatus = {
  hasKey: boolean
  useForChat: boolean
}

export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not available" },
        { status: 500 }
      )
    }

    const { data: authData } = await supabase.auth.getUser()

    if (!authData?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("user_keys")
      .select("provider, use_for_chat")
      .eq("user_id", authData.user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create a map of provider -> { hasKey, useForChat }
    const userKeyMap = new Map(
      data?.map((k) => [k.provider, k.use_for_chat ?? false]) || []
    )

    // Create status object for all supported providers
    // For backwards compatibility, also include the boolean value at the top level
    const providerStatus = SUPPORTED_PROVIDERS.reduce(
      (acc, provider) => {
        const hasKey = userKeyMap.has(provider)
        acc[provider] = hasKey // Keep backwards compatibility
        acc[`${provider}_status`] = {
          hasKey,
          useForChat: hasKey ? (userKeyMap.get(provider) ?? false) : false,
        }
        return acc
      },
      {} as Record<string, boolean | ProviderKeyStatus>
    )

    return NextResponse.json(providerStatus)
  } catch (err) {
    console.error("Key status error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
