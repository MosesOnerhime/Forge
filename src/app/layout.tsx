import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

export const metadata: Metadata = { title: 'Forge — Train with intent', description: 'Training, nutrition, and physique progress in one focused place.', applicationName: 'Forge', manifest: '/manifest.webmanifest' }
export const viewport: Viewport = { themeColor: '#0b0d10', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={GeistSans.variable}><body>{children}</body></html>
}
