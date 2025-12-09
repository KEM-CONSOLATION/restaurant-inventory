import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function createClient() {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  // Check for auth errors when getting user
  try {
    const { error } = await supabase.auth.getUser()
    if (error) {
      // Check if it's a refresh token error
      if (
        error.code === 'refresh_token_not_found' ||
        error.message?.includes('refresh_token_not_found') ||
        error.message?.includes('Invalid Refresh Token') ||
        (error.status === 400 && error.message?.includes('Refresh Token'))
      ) {
        // Clear cookies and redirect
        const cookieNames = ['sb-access-token', 'sb-refresh-token', 'sb-auth-token']

        cookieNames.forEach(cookieName => {
          cookieStore.delete(cookieName)
          cookieStore.delete(`${cookieName}-expires`)
        })

        redirect('/login?error=session_expired')
      }
    }
  } catch (error: any) {
    // Handle refresh token errors in catch block too
    if (
      error?.code === 'refresh_token_not_found' ||
      error?.message?.includes('refresh_token_not_found') ||
      error?.message?.includes('Invalid Refresh Token')
    ) {
      redirect('/login?error=session_expired')
    }
  }

  return supabase
}
