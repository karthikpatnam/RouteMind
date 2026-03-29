import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import './globals.css'
import 'mapbox-gl/dist/mapbox-gl.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'RouteMind AI | Predictive Supply Chain Intelligence',
  description: 'AI-powered disruption detection and autonomous routing intelligence for global supply chains. Predict. Prevent. Optimize.',
  keywords: ['supply chain', 'logistics', 'AI', 'routing', 'predictive analytics', 'disruption detection'],
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground min-h-screen`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#000',
                color: '#fff',
                border: '2px solid #000',
                borderRadius: '0px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.05em',
                fontSize: '12px',
                boxShadow: '6px 6px 0 #000',
              },
            }}
            richColors
          />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}
