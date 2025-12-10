import { createClient } from "@/lib/supabase/server"
import { isSupabaseEnabled } from "../supabase/config"

/**
 * Validates the user's identity and returns a Supabase client with proper auth context.
 * 
 * This function now uses the regular Supabase client (with anon key) for both
 * authenticated and anonymous users. This ensures RLS policies are properly enforced.
 * 
 * @param userId - The ID of the user.
 * @param isAuthenticated - Whether the user is authenticated.
 * @returns The Supabase client with proper auth context.
 */
export async function validateUserIdentity(
  userId: string,
  isAuthenticated: boolean
) {
  if (!isSupabaseEnabled) {
    return null
  }

  // Use the regular client for both authenticated and anonymous users
  // This ensures RLS policies are enforced based on auth.uid()
  const supabase = await createClient()

  if (!supabase) {
    throw new Error("Failed to initialize Supabase client")
  }

  // Get the current authenticated user from the session
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (isAuthenticated) {
    // For authenticated users, verify the session matches the userId
    if (authError || !authData?.user?.id) {
      throw new Error("Unable to get authenticated user")
    }

    if (authData.user.id !== userId) {
      throw new Error("User ID does not match authenticated user")
    }
  } else {
    // For anonymous users, verify they have an anonymous session
    if (authError || !authData?.user?.id) {
      throw new Error("No valid session found for anonymous user")
    }

    if (authData.user.id !== userId) {
      throw new Error("User ID does not match anonymous session")
    }

    // Verify the user is actually marked as anonymous
    if (!authData.user.is_anonymous) {
      throw new Error("User is not anonymous but isAuthenticated is false")
    }

    // Verify the user record exists and is marked as anonymous
    const { data: userRecord, error: userError } = await supabase
      .from("users")
      .select("id, anonymous")
      .eq("id", userId)
      .maybeSingle()

    if (userError || !userRecord) {
      throw new Error("Invalid or missing guest user")
    }

    if (!userRecord.anonymous) {
      throw new Error("User record is not marked as anonymous")
    }
  }

  return supabase
}
