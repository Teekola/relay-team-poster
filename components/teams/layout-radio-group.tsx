import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { isLayoutId, LAYOUT_IDS, type LayoutId } from "@/lib/layouts"
import { fi } from "@/messages/fi"

type Props = {
  value: LayoutId | null
  onChange: (value: LayoutId) => void
  isLoading?: boolean
}

export function LayoutRadioGroup({ value, onChange, isLoading }: Props) {
  return (
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
  )
}
