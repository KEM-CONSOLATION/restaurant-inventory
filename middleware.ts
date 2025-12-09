import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rate limiting: Simple in-memory store (for production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetTime < now) {
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000)

function checkRateLimit(ip: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now()
  const key = ip
  const record = rateLimitMap.get(key)

  if (!record || record.resetTime < now) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

export async function middleware(request: NextRequest) {
  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               request.headers.get('x-real-ip') || 
               'unknown'
    const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
    
    // Stricter limits for write operations
    const limit = isWriteOperation ? 30 : 100 // 30 writes/min, 100 reads/min
    const allowed = checkRateLimit(ip, limit, 60000) // 1 minute window

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }
  }

  // Request size limit check (for API routes)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const size = parseInt(contentLength, 10)
      const maxSize = 1024 * 1024 // 1MB limit
      if (size > maxSize) {
        return NextResponse.json(
          { error: 'Request body too large. Maximum size is 1MB.' },
          { status: 413 }
        )
      }
    }
  }
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    // Check for refresh token errors
    if (error) {
      // Check if it's a refresh token error
      if (
        error.code === 'refresh_token_not_found' ||
        error.message?.includes('refresh_token_not_found') ||
        error.message?.includes('Invalid Refresh Token') ||
        (error.status === 400 && error.message?.includes('Refresh Token'))
      ) {
        // Clear auth cookies and redirect to login
        const response = NextResponse.redirect(new URL('/login?error=session_expired', request.url))

        // Clear all Supabase auth cookies
        const cookieNames = ['sb-access-token', 'sb-refresh-token', 'sb-auth-token']

        cookieNames.forEach(cookieName => {
          response.cookies.delete(cookieName)
          response.cookies.delete(`${cookieName}-expires`)
        })

        // Also clear cookies with the project ref
        const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]
        if (projectRef) {
          cookieNames.forEach(cookieName => {
            response.cookies.delete(`${projectRef}-auth-token`)
            response.cookies.delete(`${projectRef}-auth-token-code-verifier`)
          })
        }

        return response
      }
    }

    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }

    if (request.nextUrl.pathname.startsWith('/admin')) {
      if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }

    if (request.nextUrl.pathname === '/login' && user) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return supabaseResponse
  } catch (error: any) {
    // Handle any unexpected errors, especially refresh token errors
    if (
      error?.code === 'refresh_token_not_found' ||
      error?.message?.includes('refresh_token_not_found') ||
      error?.message?.includes('Invalid Refresh Token') ||
      (error?.status === 400 && error?.message?.includes('Refresh Token'))
    ) {
      const response = NextResponse.redirect(new URL('/login?error=session_expired', request.url))

      // Clear auth cookies
      const cookieNames = ['sb-access-token', 'sb-refresh-token', 'sb-auth-token']

      cookieNames.forEach(cookieName => {
        response.cookies.delete(cookieName)
        response.cookies.delete(`${cookieName}-expires`)
      })

      return response
    }

    // For other errors, continue with normal flow
    return supabaseResponse
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
