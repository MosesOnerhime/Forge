import { createBrowserClient } from '@supabase/ssr'

export const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

export function supabase() {
  if (!configured) throw new Error('Supabase is not configured. Add the variables in .env.example to .env.local.')
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
