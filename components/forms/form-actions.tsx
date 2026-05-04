import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { fi } from "@/messages/fi"

type Props = {
  error?: string | null
  isSaving: boolean
  isLoading?: boolean
  canSave: boolean
  saveLabel: string
  savingLabel?: string
  /**
   * When provided, renders a `type="button"` and calls this on click. When
   * omitted, renders a `type="submit"` (use within a `<form onSubmit>`).
   */
  onSave?: () => void
  extraButtons?: ReactNode
}

export function FormActions({
  error,
  isSaving,
  isLoading,
  canSave,
  saveLabel,
  savingLabel = fi.common.saving,
  onSave,
  extraButtons,
}: Props) {
  const disabled = isLoading || isSaving || !canSave

  return (
    <>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button
          type={onSave ? "button" : "submit"}
          onClick={onSave}
          disabled={disabled}
        >
          {isSaving && <Spinner />}
          {isSaving ? savingLabel : saveLabel}
        </Button>
        {extraButtons}
      </div>
    </>
  )
}
