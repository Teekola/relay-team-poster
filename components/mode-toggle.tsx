"use client"

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { fi } from "@/messages/fi"

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={fi.theme.toggle}
      suppressHydrationWarning
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="relative"
    >
      <HugeiconsIcon
        icon={Sun03Icon}
        strokeWidth={2}
        className="rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0"
      />
      <HugeiconsIcon
        icon={Moon02Icon}
        strokeWidth={2}
        className="absolute rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100"
      />
    </Button>
  )
}
