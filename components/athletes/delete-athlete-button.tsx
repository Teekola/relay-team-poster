"use client"

import { useMutation } from "convex/react"
import { ConvexError } from "convex/values"
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
  athleteId: Id<"athletes">
  athleteName: string
  referenceCount: number
  isLoading?: boolean
}

export function DeleteAthleteButton({
  athleteId,
  athleteName,
  referenceCount,
  isLoading,
}: Props) {
  const remove = useMutation(api.athletes.remove)
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  // Race guard: server reference count may be newer than the prop's
  // (a team image referencing this athlete could have been added since
  // the page loaded). If the mutation throws, switch the dialog to the
  // blocked state instead of silently swallowing the error.
  const [serverBlockedCount, setServerBlockedCount] = useState<number | null>(
    null
  )

  const isBlocked = referenceCount > 0 || serverBlockedCount !== null
  const blockedCount = serverBlockedCount ?? referenceCount

  async function handleConfirm() {
    setIsDeleting(true)
    try {
      await remove({ id: athleteId })
      // Don't navigate here. The edit page detects the deleted record via
      // its Convex subscription and redirects to the listing.
    } catch (caught) {
      setIsDeleting(false)
      if (
        caught instanceof ConvexError &&
        typeof caught.data === "object" &&
        caught.data !== null &&
        "kind" in caught.data &&
        caught.data.kind === "athleteReferenced"
      ) {
        const count = (caught.data as { referenceCount: number }).referenceCount
        setServerBlockedCount(count)
        return
      }
      setOpen(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setServerBlockedCount(null)
      }}
    >
      <AlertDialogTrigger
        render={
          <Button variant="destructive" type="button" disabled={isLoading}>
            {fi.athletes.actions.delete}
          </Button>
        }
      />
      <AlertDialogContent>
        {isBlocked ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {fi.athletes.deleteDialog.blockedTitle}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {fi.athletes.deleteDialog.blockedDescription(
                  athleteName,
                  blockedCount
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setOpen(false)}>
                {fi.athletes.deleteDialog.blockedDismiss}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {fi.athletes.deleteDialog.title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {fi.athletes.deleteDialog.description(athleteName)}
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
                {isDeleting
                  ? fi.common.loading
                  : fi.athletes.deleteDialog.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
