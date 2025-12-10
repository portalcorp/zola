# Security Improvements - RLS Policy Enforcement

## Summary

Fixed a critical security issue where anonymous users were using the Supabase service role key, which bypassed all Row Level Security (RLS) policies. The app now properly enforces RLS for both anonymous and authenticated users.

## Changes Made

### 1. Updated `lib/supabase/server-guest.ts`
- Renamed `createGuestServerClient()` to `createAdminClient()` for clarity
- Added deprecation notice and documentation
- Made it clear this should ONLY be used for admin operations

### 2. Updated `lib/server/api.ts`
- Modified `validateUserIdentity()` to use regular client for both user types
- Now properly validates anonymous sessions using `auth.getUser()`
- Checks that anonymous users have `is_anonymous=true` in their session
- Verifies user records match the session

### 3. Security Model

#### Before (Insecure)
```
Anonymous User → Service Role Key → Bypasses RLS → ⚠️ Security Risk
Authenticated User → Anon Key → RLS Enforced → ✓ Secure
```

#### After (Secure)
```
Anonymous User → Anon Key + Anonymous Session → RLS Enforced → ✓ Secure
Authenticated User → Anon Key + Auth Session → RLS Enforced → ✓ Secure
```

## RLS Policies (Already Configured)

All tables have proper RLS policies that check `auth.uid() = user_id`:

- ✅ **users** - Users can only view/update their own data
- ✅ **chats** - Users can only access their own chats (or public ones)
- ✅ **messages** - Users can only view messages from their own chats
- ✅ **projects** - Users can only access their own projects
- ✅ **chat_attachments** - Users can only access their own attachments
- ✅ **feedback** - Users can only create/view their own feedback
- ✅ **user_keys** - Users can only manage their own API keys
- ✅ **user_preferences** - Users can only manage their own preferences

## Anonymous User Flow

1. User visits app without logging in
2. Frontend calls `getOrCreateGuestUserId()`
3. Supabase creates anonymous auth session via `signInAnonymously()`
4. User record created with `anonymous=true` (using admin client)
5. All subsequent API calls use the anonymous session
6. RLS policies enforce `auth.uid() = user_id` isolation

## Service Role Usage

The service role key (admin client) should **ONLY** be used for:

1. **Creating user records** during signup/anonymous auth (`/api/create-guest`)
2. **OAuth callback** user creation (`/auth/callback`)

All other operations use the regular client with proper auth context.

## Supabase Security Advisor Results

✅ **All RLS policies are properly configured and enforced**

The Supabase security advisor confirms:
- All tables have RLS policies that allow anonymous access (as intended)
- Policies properly check `auth.uid() = user_id` for data isolation
- Anonymous users can only access their own data
- No critical security issues detected

⚠️ **Advisory Warnings (Expected)**
- "Anonymous Access Policies" warnings are **intentional** - the app is designed to support anonymous users
- These warnings are informational, not security issues
- Performance optimizations available but not security-critical

## Testing Checklist

- [ ] Anonymous user can create chats
- [ ] Anonymous user can send messages
- [ ] Anonymous user cannot access other users' data
- [ ] Authenticated user can create chats
- [ ] Authenticated user can send messages
- [ ] Authenticated user cannot access other users' data
- [ ] Anonymous user cannot access authenticated user's data
- [ ] Rate limits work correctly for both user types

## Security Benefits

1. **Defense in Depth** - RLS enforced at database level, not just application level
2. **Reduced Attack Surface** - Service role key only used for specific admin operations
3. **Proper Isolation** - Anonymous users cannot access each other's data
4. **Audit Trail** - All database operations tied to auth.uid()
5. **Fail-Safe** - Even if API validation has bugs, RLS prevents unauthorized access

## Migration Applied

Created migration `add_security_documentation` to document the security model in the database.

