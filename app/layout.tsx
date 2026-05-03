import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server"

import "./globals.css"
import { ConvexClientProvider } from "@/app/ConvexClientProvider"
import { ThemeProvider } from "@/components/theme-provider"
import { geist, geistMono } from "@/lib/fonts"
import { cn } from "@/lib/utils"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="fi"
        suppressHydrationWarning
        className={cn(
          "antialiased",
          geistMono.variable,
          "font-sans",
          geist.variable
        )}
      >
        <body>
          <ConvexClientProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  )
}
