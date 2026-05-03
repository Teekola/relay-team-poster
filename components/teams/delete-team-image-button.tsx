"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { fi } from "@/messages/fi"

type Props = {
  teamImageId: Id<"teamImages">
  teamImageName: string
  variant?: "default" | "ghost"
  size?: "default" | "sm"
  isLoading?: boolean
}

export function DeleteTeamImageButton({
  teamImageId,
  teamImageName,
  variant = "default",
  size = "default",
  isLoading,
}: Props) {
  const remove = useMutation(api.teamImages.remove)
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleConfirm() {
    setIsDeleting(true)
    try {
      await remove({ id: teamImageId })
      // Don't navigate here. The edit page detects the deleted record via
      // its Convex subscription and redirects to the listing — keeping the
      // navigation logic in one place avoids racing with the page's
      // notFound() check.
    } catch {
      setIsDeleting(false)
      setOpen(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant={variant === "ghost" ? "ghost" : "destructive"}
            size={size}
            type="button"
            disabled={isLoading}
            className={
              variant === "ghost"
                ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                : undefined
            }
          >
            {fi.teams.actions.delete}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{fi.teams.deleteDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {fi.teams.deleteDialog.description(teamImageName)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {fi.athletes.actions.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? fi.common.loading : fi.teams.deleteDialog.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
