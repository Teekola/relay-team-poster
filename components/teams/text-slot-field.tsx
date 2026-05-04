import type { Dispatch, SetStateAction } from "react"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type Slot = {
  key: string
  label: string
  defaultValue?: string
}

type Props = {
  slot: Slot
  values: Record<string, string>
  setValues: Dispatch<SetStateAction<Record<string, string>>>
  isLoading?: boolean
}

export function TextSlotField({ slot, values, setValues, isLoading }: Props) {
  const id = `text-${slot.key}`
  return (
    <Field>
      <FieldLabel htmlFor={id}>{slot.label}</FieldLabel>
      <Input
        id={id}
        value={values[slot.key] ?? slot.defaultValue ?? ""}
        onChange={(event) =>
          setValues((prev) => ({ ...prev, [slot.key]: event.target.value }))
        }
        isLoading={isLoading}
      />
    </Field>
  )
}
