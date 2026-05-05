"use client"

import { useMemo } from "react"
import type { UseFormReturn } from "react-hook-form"
import { RosterPicker } from "@/components/teams/roster-picker"
import { FieldGroup } from "@/components/ui/field"
import { FormBase, FormInput, FormSelect } from "@/components/ui/form-fields"
import { LayoutRadioGroup } from "@/components/teams/layout-radio-group"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import type { Layout, LayoutId } from "@/lib/layouts"
import {
  compareTextSlots,
  PLACEHOLDER_TEXT_SLOTS,
  type TeamImageFormValues,
} from "@/lib/team-image-form"
import { fi } from "@/messages/fi"

type Props = {
  form: UseFormReturn<TeamImageFormValues>
  layout: Layout | null
  templates: { _id: Id<"templates">; name: string }[] | undefined
  athletes: (Doc<"athletes"> & { imageUrl: string | null })[] | undefined
  onLayoutChange: (value: LayoutId) => void
  isLoading?: boolean
}

export function TeamImageFormFields({
  form,
  layout,
  templates,
  athletes,
  onLayoutChange,
  isLoading = false,
}: Props) {
  const orderedSlots = useMemo(
    () =>
      layout
        ? [...layout.textSlots].sort(compareTextSlots)
        : PLACEHOLDER_TEXT_SLOTS,
    [layout]
  )
  const eventSlot = orderedSlots.find(
    (s) => s.key === "eventName" || s.key === "_loading_event"
  )
  const otherSlots = orderedSlots.filter(
    (s) => s.key !== "eventName" && s.key !== "_loading_event"
  )

  const isEmpty = templates !== undefined && templates.length === 0
  const templatePlaceholder =
    templates === undefined
      ? fi.common.loading
      : isEmpty
        ? fi.templates.empty
        : fi.teams.fields.template

  return (
    <FieldGroup>
      <FormInput
        control={form.control}
        name="name"
        label={fi.teams.fields.name}
        isLoading={isLoading}
      />

      <FormBase
        control={form.control}
        name="layoutId"
        label={fi.teams.fields.layout}
      >
        {(field) => (
          <LayoutRadioGroup
            value={field.value}
            onChange={onLayoutChange}
            isLoading={isLoading}
          />
        )}
      </FormBase>

      <FormSelect
        control={form.control}
        name="templateId"
        label={fi.teams.fields.template}
        placeholder={templatePlaceholder}
        isLoading={isLoading}
        disabled={templates === undefined || isEmpty}
        options={(templates ?? []).map((template) => ({
          value: template._id,
          label: template.name,
        }))}
      />

      {eventSlot && (
        <FormInput
          control={form.control}
          name={`textValues.${eventSlot.key}`}
          label={eventSlot.label}
          isLoading={isLoading}
        />
      )}

      {otherSlots.map((slot) => (
        <FormInput
          key={slot.key}
          control={form.control}
          name={`textValues.${slot.key}`}
          label={slot.label}
          isLoading={isLoading}
        />
      ))}

      <FormBase
        control={form.control}
        name="athleteOrder"
        label={fi.teams.fields.roster}
      >
        {(field) => (
          <RosterPicker
            athletes={athletes}
            selected={field.value}
            requiredCount={layout?.requiredAthleteCount ?? 0}
            onChange={field.onChange}
            isLoading={isLoading}
          />
        )}
      </FormBase>
    </FieldGroup>
  )
}
