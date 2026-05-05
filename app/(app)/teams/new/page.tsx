"use client"

import { useMutation, useQuery } from "convex/react"
import type Konva from "konva"
import { useRouter } from "next/navigation"
import {
  type RefObject,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  type Control,
  Controller,
  type UseFormReturn,
  useForm,
  useWatch,
} from "react-hook-form"
import { FormActions } from "@/components/forms/form-actions"
import { PageHeader } from "@/components/layout/page-header"
import { ExportButton } from "@/components/team-image/export-button"
import { ResponsiveTeamImageStage } from "@/components/team-image/team-image-stage"
import { LayoutRadioGroup } from "@/components/teams/layout-radio-group"
import { RosterPicker } from "@/components/teams/roster-picker"
import { TemplateSelect } from "@/components/teams/template-select"
import { TextSlotField } from "@/components/teams/text-slot-field"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { useOrderedAthletes } from "@/hooks/use-ordered-athletes"
import { LAYOUTS, type Layout, type LayoutId } from "@/lib/layouts"
import { fi } from "@/messages/fi"

const DEFAULT_LAYOUT_ID: LayoutId = "relay3"
const STAGE_DISPLAY_WIDTH = 540

type FormValues = {
  name: string
  layoutId: LayoutId
  templateId: Id<"templates"> | null
  textValues: Record<string, string>
  athleteOrder: (Id<"athletes"> | null)[]
}

function withLayoutDefaults(
  layout: Layout,
  stored: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const slot of layout.textSlots) {
    if (slot.defaultValue) result[slot.key] = slot.defaultValue
  }
  return { ...result, ...stored }
}

export default function NewTeamImagePage() {
  const router = useRouter()
  const createTeamImage = useMutation(api.teamImages.create)
  const athletes = useQuery(api.athletes.list, {})

  const stageRef = useRef<Konva.Stage>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      layoutId: DEFAULT_LAYOUT_ID,
      templateId: null,
      textValues: withLayoutDefaults(LAYOUTS[DEFAULT_LAYOUT_ID], {}),
      athleteOrder: [],
    },
  })

  const layoutId = useWatch({ control: form.control, name: "layoutId" })
  const layout = LAYOUTS[layoutId]
  const templates = useQuery(api.templates.list, { aspect: layout.aspect })

  useEffect(() => {
    if (!templates || templates.length === 0) return
    if (form.getValues("templateId") !== null) return
    form.setValue("templateId", templates[0]._id, { shouldDirty: false })
  }, [templates, form])

  function handleLayoutChange(value: LayoutId) {
    if (value === layoutId) return
    form.setValue("layoutId", value)
    form.setValue("templateId", null)
    form.setValue("athleteOrder", [])
    const currentText = form.getValues("textValues")
    form.setValue("textValues", withLayoutDefaults(LAYOUTS[value], currentText))
  }

  const handleSave = form.handleSubmit(async (values) => {
    setError(null)
    if (!values.templateId) {
      setError("Valitse malli.")
      return
    }
    const required = LAYOUTS[values.layoutId].requiredAthleteCount
    if (values.athleteOrder.some((id) => id === null)) {
      const missing = values.athleteOrder.filter((id) => id === null).length
      const remaining = required - values.athleteOrder.length
      setError(fi.teams.errors.rosterIncomplete(missing + remaining))
      return
    }
    if (values.athleteOrder.length < required) {
      setError(
        fi.teams.errors.rosterIncomplete(required - values.athleteOrder.length)
      )
      return
    }
    const validIds = values.athleteOrder.filter(
      (id): id is Id<"athletes"> => id !== null
    )

    setIsSaving(true)
    try {
      const created = await createTeamImage({
        templateId: values.templateId,
        layoutId: values.layoutId,
        name:
          values.name.trim() || `${fi.layouts[values.layoutId]} ${Date.now()}`,
        athleteOrder: validIds,
        textValues: values.textValues,
      })
      router.push(`/teams/${created}`)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Tallennus epäonnistui."
      )
    } finally {
      setIsSaving(false)
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        parent={{ href: "/teams", label: fi.teams.title }}
        current={fi.teams.new}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <FormFields
            form={form}
            layout={layout}
            templates={templates}
            athletes={athletes}
            onLayoutChange={handleLayoutChange}
          />

          <FormActionsSection
            control={form.control}
            error={error}
            isSaving={isSaving}
            layout={layout}
            templates={templates}
            stageRef={stageRef}
            onSave={handleSave}
          />
        </div>

        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <StageSection
            control={form.control}
            templates={templates}
            athletes={athletes}
            stageRef={stageRef}
          />
        </div>
      </div>
    </div>
  )
}

function FormFields({
  form,
  layout,
  templates,
  athletes,
  onLayoutChange,
}: {
  form: UseFormReturn<FormValues>
  layout: Layout
  templates: { _id: Id<"templates">; name: string }[] | undefined
  athletes: (Doc<"athletes"> & { imageUrl: string | null })[] | undefined
  onLayoutChange: (value: LayoutId) => void
}) {
  const eventSlot = layout.textSlots.find((s) => s.key === "eventName")
  const otherSlots = layout.textSlots.filter((s) => s.key !== "eventName")

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="team-image-name">
          {fi.teams.fields.name}
        </FieldLabel>
        <Input id="team-image-name" {...form.register("name")} />
      </Field>

      <Controller
        control={form.control}
        name="layoutId"
        render={({ field }) => (
          <LayoutRadioGroup value={field.value} onChange={onLayoutChange} />
        )}
      />

      <Controller
        control={form.control}
        name="templateId"
        render={({ field }) => (
          <TemplateSelect
            templates={templates}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      {eventSlot && (
        <TextSlotField
          slot={eventSlot}
          registration={form.register(`textValues.${eventSlot.key}`)}
        />
      )}

      {otherSlots.map((slot) => (
        <TextSlotField
          key={slot.key}
          slot={slot}
          registration={form.register(`textValues.${slot.key}`)}
        />
      ))}

      <Field>
        <FieldLabel>{fi.teams.fields.roster}</FieldLabel>
        <Controller
          control={form.control}
          name="athleteOrder"
          render={({ field }) => (
            <RosterPicker
              athletes={athletes}
              selected={field.value}
              requiredCount={layout.requiredAthleteCount}
              onChange={field.onChange}
            />
          )}
        />
      </Field>
    </FieldGroup>
  )
}

function StageSection({
  control,
  templates,
  athletes,
  stageRef,
}: {
  control: Control<FormValues>
  templates:
    | { _id: Id<"templates">; backgroundUrl: string | null }[]
    | undefined
  athletes: (Doc<"athletes"> & { imageUrl: string | null })[] | undefined
  stageRef: RefObject<Konva.Stage | null>
}) {
  const layoutId = useWatch({ control, name: "layoutId" })
  const templateId = useWatch({ control, name: "templateId" })
  const textValues = useWatch({ control, name: "textValues" })
  const athleteOrder = useWatch({ control, name: "athleteOrder" })

  const layout = LAYOUTS[layoutId]
  const selectedTemplate = useMemo(() => {
    if (!templateId || !templates) return null
    return templates.find((t) => t._id === templateId) ?? null
  }, [templateId, templates])
  const orderedAthletes = useOrderedAthletes(athleteOrder ?? [], athletes)
  const deferredTextValues = useDeferredValue(textValues ?? {})

  return (
    <ResponsiveTeamImageStage
      stageRef={stageRef}
      layout={layout}
      backgroundUrl={selectedTemplate?.backgroundUrl ?? null}
      athletes={orderedAthletes}
      textValues={deferredTextValues}
      maxWidth={STAGE_DISPLAY_WIDTH}
    />
  )
}

function FormActionsSection({
  control,
  error,
  isSaving,
  layout,
  templates,
  stageRef,
  onSave,
}: {
  control: Control<FormValues>
  error: string | null
  isSaving: boolean
  layout: Layout
  templates: { _id: Id<"templates"> }[] | undefined
  stageRef: RefObject<Konva.Stage | null>
  onSave: () => void
}) {
  const name = useWatch({ control, name: "name" })
  const templateId = useWatch({ control, name: "templateId" })
  const athleteOrder = useWatch({ control, name: "athleteOrder" })

  const rosterComplete =
    athleteOrder.length === layout.requiredAthleteCount &&
    athleteOrder.every((id) => id !== null)
  const canSave = rosterComplete && templateId !== null

  const selectedTemplate = templates?.find((t) => t._id === templateId) ?? null

  return (
    <FormActions
      error={error}
      isSaving={isSaving}
      canSave={canSave}
      saveLabel={fi.teams.actions.save}
      onSave={onSave}
      extraButtons={
        <ExportButton
          stageRef={stageRef}
          filename={(name.trim() || fi.layouts[layout.id]).replace(/\s+/g, "_")}
          disabled={!selectedTemplate}
        />
      }
    />
  )
}
