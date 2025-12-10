import type { Database } from "@/app/types/database.types"
import { createServerClient } from "@supabase/ssr"
import { isSupabaseEnabled } from "./config"

/**
 * Creates a Supabase admin client with service role key.
 * WARNING: This bypasses RLS policies. Only use for:
 * - Creating user records during signup/anonymous auth
 * - Admin operations that need to bypass RLS
 * 
 * For normal API operations, use createClient() instead.
 */
export async function createAdminClient() {
  if (!isSupabaseEnabled) {
    return null
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}

/**
 * @deprecated Use createAdminClient() instead for clarity
 */
export async function createGuestServerClient() {
  return createAdminClient()
}
