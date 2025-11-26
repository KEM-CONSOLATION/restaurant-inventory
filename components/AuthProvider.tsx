'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle token refresh errors
      if (event === 'TOKEN_REFRESHED' && !session) {
        // Token refresh failed, log out user
        await handleLogout()
      }

      // Handle signed out event
      if (event === 'SIGNED_OUT') {
        // Clear any local storage or state if needed
        if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
          router.push('/login?error=session_expired')
          router.refresh()
        }
      }
    })

    // Set up global error handler for Supabase client errors
    const handleAuthError = async (error: any) => {
      // Check if it's a refresh token error
      if (
        error?.code === 'refresh_token_not_found' ||
        error?.message?.includes('refresh_token_not_found') ||
        error?.message?.includes('Invalid Refresh Token') ||
        (error?.status === 400 && error?.message?.includes('Refresh Token'))
      ) {
        console.error('Refresh token error detected, logging out user:', error)
        await handleLogout()
      }
    }

    // Listen for unhandled promise rejections (catches auth errors)
    const handleUnhandledRejection = async (event: PromiseRejectionEvent) => {
      const error = event.reason
      if (
        error?.code === 'refresh_token_not_found' ||
        error?.message?.includes('refresh_token_not_found') ||
        error?.message?.includes('Invalid Refresh Token') ||
        (error?.status === 400 && error?.message?.includes('Refresh Token'))
      ) {
        event.preventDefault() // Prevent default error logging
        console.error('Unhandled refresh token error, logging out user:', error)
        await handleLogout()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // Periodically check auth status
    const checkAuthStatus = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          // Check if it's a refresh token error
          if (
            error.code === 'refresh_token_not_found' ||
            error.message?.includes('refresh_token_not_found') ||
            error.message?.includes('Invalid Refresh Token')
          ) {
            await handleLogout()
            return
          }
        }

        // If no session and on protected route, redirect to login
        if (!session && (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin'))) {
          router.push('/login?error=session_expired')
          router.refresh()
        }
      } catch (error: any) {
        // Handle any errors during session check
        if (
          error?.code === 'refresh_token_not_found' ||
          error?.message?.includes('refresh_token_not_found') ||
          error?.message?.includes('Invalid Refresh Token')
        ) {
          await handleLogout()
        }
      }
    }

    // Check auth status every 30 seconds
    const authCheckInterval = setInterval(checkAuthStatus, 30000)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      clearInterval(authCheckInterval)
    }
  }, [router, pathname])

  const handleLogout = async () => {
    try {
      // Clear all auth-related cookies
      document.cookie.split(';').forEach((c) => {
        const cookieName = c.trim().split('=')[0]
        if (cookieName.includes('supabase') || cookieName.includes('auth')) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
        }
      })

      // Sign out from Supabase
      await supabase.auth.signOut()

      // Redirect to login
      if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
        router.push('/login?error=session_expired')
        router.refresh()
      }
    } catch (error) {
      console.error('Error during logout:', error)
      // Force redirect even if logout fails
      router.push('/login?error=session_expired')
      router.refresh()
    }
  }

  return <>{children}</>
}

