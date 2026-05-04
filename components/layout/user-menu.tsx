"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { Logout01Icon, UserCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useQuery } from "convex/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { api } from "@/convex/_generated/api"
import { fi } from "@/messages/fi"

export function UserMenu() {
  const { signOut } = useAuthActions()
  const me = useQuery(api.users.me)
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={fi.userMenu.label}>
            <HugeiconsIcon icon={UserCircleIcon} strokeWidth={2} />
          </Button>
        }
      />
      <PopoverContent align="end" sideOffset={8} className="w-60 gap-2 p-2">
        {me && (
          <div className="border-b px-2 pt-1 pb-2">
            <div className="truncate font-medium text-sm">
              {me.name ?? me.email}
            </div>
            {me.name && (
              <div className="truncate text-muted-foreground text-xs">
                {me.email}
              </div>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            signOut()
          }}
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <HugeiconsIcon icon={Logout01Icon} strokeWidth={2} />
          {fi.nav.signOut}
        </button>
      </PopoverContent>
    </Popover>
  )
}
