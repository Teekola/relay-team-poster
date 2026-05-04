import { Field, FieldLabel } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { LAYOUT_IDS, type LayoutId } from "@/lib/layouts"
import { fi } from "@/messages/fi"

const LAYOUT_ID_SET: ReadonlySet<string> = new Set<string>(LAYOUT_IDS)

function isLayoutId(value: string): value is LayoutId {
  return LAYOUT_ID_SET.has(value)
}

type Props = {
  value: LayoutId | null
  onChange: (value: LayoutId) => void
  isLoading?: boolean
}

export function LayoutRadioGroup({ value, onChange, isLoading }: Props) {
  return (
    <Field>
      <FieldLabel>{fi.teams.fields.layout}</FieldLabel>
      <RadioGroup
        value={value ?? ""}
        onValueChange={(next) => {
          if (typeof next === "string" && isLayoutId(next)) onChange(next)
        }}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        isLoading={isLoading}
      >
        {LAYOUT_IDS.map((id) => (
          <Label
            key={id}
            className="flex cursor-pointer items-center gap-2 font-normal text-sm"
          >
            <RadioGroupItem value={id} />
            {fi.layouts[id]}
          </Label>
        ))}
      </RadioGroup>
    </Field>
  )
}
