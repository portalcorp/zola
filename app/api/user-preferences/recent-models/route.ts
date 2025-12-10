import { createClient } from "@/lib/supabase/server"
import { PostgrestError } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const MAX_RECENT_MODELS = 5 // Keep only the 5 most recent models

// Type for user data with recent_models (not yet in generated types)
type UserWithRecentModels = {
  recent_models: string[] | null
}

type QueryResult = {
  data: UserWithRecentModels | null
  error: PostgrestError | null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse the request body
    const body = await request.json()
    const { model_id } = body

    // Validate the model_id
    if (typeof model_id !== "string" || !model_id.trim()) {
      return NextResponse.json(
        { error: "model_id must be a non-empty string" },
        { status: 400 }
      )
    }

    // Get the user's current recent models
    // Note: Using type assertion since recent_models is not yet in generated Supabase types
    const { data: userData, error: fetchError } = (await supabase
      .from("users")
      .select("recent_models")
      .eq("id", user.id)
      .single()) as unknown as QueryResult

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching recent models:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch recent models" },
        { status: 500 }
      )
    }

    // Get current recent models or empty array
    const currentRecent: string[] = userData?.recent_models || []

    // Remove the model if it already exists (to avoid duplicates)
    const filtered = currentRecent.filter((id: string) => id !== model_id)

    // Add the new model at the beginning
    const updatedRecent = [model_id, ...filtered].slice(0, MAX_RECENT_MODELS)

    // Update the user's recent models
    const { data, error } = (await supabase
      .from("users")
      .update({
        recent_models: updatedRecent,
      } as never)
      .eq("id", user.id)
      .select("recent_models")
      .single()) as unknown as QueryResult

    if (error) {
      console.error("Error updating recent models:", error)
      return NextResponse.json(
        { error: "Failed to update recent models" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      recent_models: data?.recent_models || [],
    })
  } catch (error) {
    console.error("Error in recent-models API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      )
    }

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the user's recent models
    // Note: Using type assertion since recent_models is not yet in generated Supabase types
    const { data, error } = (await supabase
      .from("users")
      .select("recent_models")
      .eq("id", user.id)
      .single()) as unknown as QueryResult

    if (error) {
      console.error("Error fetching recent models:", error)
      return NextResponse.json(
        { error: "Failed to fetch recent models" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      recent_models: data?.recent_models || [],
    })
  } catch (error) {
    console.error("Error in recent-models GET API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
