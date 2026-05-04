"use client"

import { memo, useMemo } from "react"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { fi } from "@/messages/fi"

type AthleteOption = Doc<"athletes"> & { imageUrl: string | null }

type Props = {
  athletes: AthleteOption[] | undefined
  selected: (Id<"athletes"> | null)[]
  requiredCount: number
  onChange: (next: (Id<"athletes"> | null)[]) => void
  /**
   * When true, render disabled slot rows with a loading combobox in each
   * — for use while the parent record is still being fetched. The parent
   * is responsible for hiding the picker entirely until requiredCount is
   * known (i.e. layout has been picked).
   */
  isLoading?: boolean
}

export const RosterPicker = memo(RosterPickerInner)

function RosterPickerInner({
  athletes,
  selected,
  requiredCount,
  onChange,
  isLoading,
}: Props) {
  // The full option list is computed once per athletes change; per-slot
  // exclusion happens below by filtering this stable array.
  const allOptions = useMemo<ComboboxOption[]>(
    () =>
      (athletes ?? []).map((athlete) => ({
        value: athlete._id,
        label: athlete.name,
      })),
    [athletes]
  )

  // Treat both the parent's "record loading" and the local "athletes
  // query loading" as the same loading state — same visual treatment.
  const showLoading = isLoading || athletes === undefined

  // When loading, render a sensible default of placeholder rows so the
  // section has visible vertical space (parents typically only render the
  // picker once they know requiredCount, but be defensive).
  const placeholderCount = requiredCount > 0 ? requiredCount : 4
  const slots: (Id<"athletes"> | null)[] = Array.from(
    { length: showLoading ? placeholderCount : requiredCount },
    (_, i) => selected[i] ?? null
  )

  function setSlot(index: number, value: Id<"athletes"> | null) {
    const next = [...slots]
    next[index] = value
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {slots.map((selectedId, index) => {
        return (
          <div
            // Slots are positional (leg 1, leg 2, …); index is the natural key.
            // biome-ignore lint/suspicious/noArrayIndexKey: positional UI, not data identity
            key={`slot-${index}`}
            className="flex items-center gap-2"
          >
            <span className="w-5 shrink-0 text-muted-foreground text-sm tabular-nums">
              {index + 1}.
            </span>
            <Combobox
              className="flex-1"
              // Same athlete may appear in multiple slots — useful when a
              // runner takes more than one leg or the editor is sketching.
              options={allOptions}
              value={selectedId}
              onChange={(value) =>
                setSlot(index, (value as Id<"athletes"> | null) ?? null)
              }
              placeholder={fi.teams.actions.pickAthlete}
              emptyMessage={fi.athletes.empty}
              isLoading={showLoading}
            />
          </div>
        )
      })}
    </div>
  )
}
