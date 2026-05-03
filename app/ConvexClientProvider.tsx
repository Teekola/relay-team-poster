"use client"

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs"
import { ConvexReactClient, useConvexAuth, useMutation } from "convex/react"
import { type ReactNode, useEffect } from "react"
import { api } from "@/convex/_generated/api"

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
if (!convexUrl) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL environment variable.")
}

const convex = new ConvexReactClient(convexUrl)

function MembershipBootstrap({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useConvexAuth()
  const bootstrap = useMutation(api.users.bootstrapMembership)

  useEffect(() => {
    if (!isAuthenticated) return
    bootstrap({}).catch(() => {
      // Bootstrap is idempotent; ignore transient failures.
    })
  }, [isAuthenticated, bootstrap])

  return <>{children}</>
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthNextjsProvider client={convex}>
      <MembershipBootstrap>{children}</MembershipBootstrap>
    </ConvexAuthNextjsProvider>
  )
}
