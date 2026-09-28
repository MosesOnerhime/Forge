import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const destination = url.searchParams.get('next')
  const next = destination?.startsWith('/') && !destination.startsWith('//') ? destination : '/today'
  if (code && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const response = NextResponse.redirect(new URL(next, url.origin))
    const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) },
      },
    })
    const { error } = await client.auth.exchangeCodeForSession(code)
    if (!error) return response
  }
  return NextResponse.redirect(new URL('/login?error=confirmation', url.origin))
}
