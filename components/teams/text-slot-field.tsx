import type { UseFormRegisterReturn } from "react-hook-form"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type Slot = {
  key: string
  label: string
}

type Props = {
  slot: Slot
  registration: UseFormRegisterReturn
  isLoading?: boolean
}

export function TextSlotField({ slot, registration, isLoading }: Props) {
  const id = `text-${slot.key}`
  return (
    <Field>
      <FieldLabel htmlFor={id}>{slot.label}</FieldLabel>
      <Input id={id} {...registration} isLoading={isLoading} />
    </Field>
  )
}
