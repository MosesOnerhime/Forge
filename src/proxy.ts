import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return NextResponse.next({ request })
  let response = NextResponse.next({ request })
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  // getClaims validates the token and refreshes cookies when needed.
  const { data } = await client.auth.getClaims()
  const path = request.nextUrl.pathname
  const privateRoute = ['/today','/workouts','/nutrition','/progress','/journal','/settings','/goals'].some(prefix => path === prefix || path.startsWith(`${prefix}/`))
  if (privateRoute && !data?.claims) {
    const url = request.nextUrl.clone(); url.pathname = '/login'; url.search = ''
    return NextResponse.redirect(url)
  }
  return response
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|offline.html).*)'] }
