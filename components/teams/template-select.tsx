import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Id } from "@/convex/_generated/dataModel"
import { fi } from "@/messages/fi"

type TemplateOption = {
  _id: Id<"templates">
  name: string
}

type Props = {
  templates: TemplateOption[] | undefined
  value: Id<"templates"> | null
  onChange: (value: Id<"templates"> | null) => void
  isLoading?: boolean
}

export function TemplateSelect({
  templates,
  value,
  onChange,
  isLoading,
}: Props) {
  const isEmpty = templates !== undefined && templates.length === 0
  const placeholder =
    templates === undefined
      ? fi.common.loading
      : isEmpty
        ? fi.templates.empty
        : fi.teams.fields.template

  return (
    <Field>
      <FieldLabel>{fi.teams.fields.template}</FieldLabel>
      <Select
        value={value}
        disabled={isLoading || templates === undefined || isEmpty}
        onValueChange={(next) => onChange(next as Id<"templates"> | null)}
      >
        <SelectTrigger isLoading={isLoading} className="w-full">
          <SelectValue placeholder={placeholder}>
            {(v) => templates?.find((t) => t._id === v)?.name ?? null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(templates ?? []).map((template) => (
            <SelectItem key={template._id} value={template._id}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
