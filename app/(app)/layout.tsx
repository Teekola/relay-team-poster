import type { ReactNode } from "react"
import { SiteNav } from "@/components/layout/site-nav"

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteNav />
      <main className="container mx-auto flex flex-1 flex-col gap-6 p-3 sm:p-6">
        {children}
      </main>
    </div>
  )
}
