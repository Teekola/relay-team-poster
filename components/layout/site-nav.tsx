"use client"

import { Menu01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { UserMenu } from "@/components/layout/user-menu"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { fi } from "@/messages/fi"

const NAV_ITEMS = [
  { href: "/teams", label: fi.nav.teams },
  { href: "/athletes", label: fi.nav.athletes },
  { href: "/templates", label: fi.nav.templates },
] as const

export function SiteNav() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close the mobile menu whenever the route changes (e.g. after the user
  // taps a link inside it). `pathname` is the *trigger* — the effect body
  // intentionally only calls a setter, so biome's "extra dependency" lint
  // is a false positive here.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the intended trigger
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center gap-3 px-3 sm:gap-6 sm:px-6">
        <Popover open={mobileOpen} onOpenChange={setMobileOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={fi.nav.menu}
                className="sm:hidden"
              >
                <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} />
              </Button>
            }
          />
          <PopoverContent
            align="start"
            sideOffset={8}
            className="w-56 gap-1 p-2 sm:hidden"
          >
            <nav className="flex flex-col">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname?.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-lg px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground",
                      isActive &&
                        "bg-muted font-medium text-foreground hover:bg-muted"
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </PopoverContent>
        </Popover>

        <Link href="/dashboard" className="shrink-0 font-medium">
          {fi.app.name}
        </Link>

        <nav className="hidden flex-1 gap-4 text-sm sm:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname?.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground",
                  isActive && "font-medium text-foreground"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 text-sm sm:ml-0">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
