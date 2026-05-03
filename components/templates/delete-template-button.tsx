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
  templateId: Id<"templates">
  templateName: string
  isLoading?: boolean
}

export function DeleteTemplateButton({
  templateId,
  templateName,
  isLoading,
}: Props) {
  const remove = useMutation(api.templates.remove)
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleConfirm() {
    setIsDeleting(true)
    try {
      await remove({ id: templateId })
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
        disabled={isLoading}
        render={
          <Button variant="destructive" type="button" disabled={isLoading}>
            {fi.templates.actions.delete}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{fi.templates.deleteDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {fi.templates.deleteDialog.description(templateName)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {fi.templates.actions.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? fi.common.loading : fi.templates.deleteDialog.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
