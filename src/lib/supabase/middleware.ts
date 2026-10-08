import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
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

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const adminId = process.env.GOTU_ADMIN_USER_ID

  const url = request.nextUrl.clone()
  const isAuthRoute = url.pathname.startsWith('/login') || url.pathname.startsWith('/register') || url.pathname.startsWith('/forgot-password')
  const isAdminRoute = url.pathname.startsWith('/admin')
  const isDashboardRoute = url.pathname.startsWith('/dashboard')

  if (!user && (isDashboardRoute || isAdminRoute)) {
    // no user, potentially respond by redirecting the user to the login page
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const isSuperAdmin = adminId && user.id === adminId;

    if (isAdminRoute && !isSuperAdmin) {
      // Normal user trying to access admin route
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    if (isDashboardRoute && isSuperAdmin) {
      // Super admin trying to access normal dashboard
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }

    if (isAuthRoute) {
      // Authenticated user trying to access auth pages
      url.pathname = isSuperAdmin ? '/admin' : '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
