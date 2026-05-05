"use client"

import { zodResolver } from "@hookform/resolvers/zod"
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
  type UseFormReturn,
  useForm,
  useWatch,
} from "react-hook-form"
import { z } from "zod"
import { FormActions } from "@/components/forms/form-actions"
import { PageHeader } from "@/components/layout/page-header"
import { ExportButton } from "@/components/team-image/export-button"
import { ResponsiveTeamImageStage } from "@/components/team-image/team-image-stage"
import { LayoutRadioGroup } from "@/components/teams/layout-radio-group"
import { RosterPicker } from "@/components/teams/roster-picker"
import { FieldGroup } from "@/components/ui/field"
import { FormBase, FormInput, FormSelect } from "@/components/ui/form-fields"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { useOrderedAthletes } from "@/hooks/use-ordered-athletes"
import {
  LAYOUT_IDS,
  LAYOUTS,
  type Layout,
  type LayoutId,
  withLayoutDefaults,
} from "@/lib/layouts"
import { fi } from "@/messages/fi"

const DEFAULT_LAYOUT_ID: LayoutId = "relay3"
const STAGE_DISPLAY_WIDTH = 540

const teamImageSchema = z
  .object({
    name: z.string().trim(),
    layoutId: z.enum(LAYOUT_IDS as readonly [LayoutId, ...LayoutId[]]),
    templateId: z
      .custom<Id<"templates">>((v) => typeof v === "string" && v.length > 0)
      .nullable(),
    textValues: z.record(z.string(), z.string()),
    athleteOrder: z.array(
      z
        .custom<Id<"athletes">>((v) => typeof v === "string" && v.length > 0)
        .nullable()
    ),
  })
  .superRefine((data, ctx) => {
    if (data.templateId === null) {
      ctx.addIssue({
        code: "custom",
        message: fi.teams.errors.templateRequired,
        path: ["templateId"],
      })
    }
  })

type FormValues = z.infer<typeof teamImageSchema>

export default function NewTeamImagePage() {
  const router = useRouter()
  const createTeamImage = useMutation(api.teamImages.create)
  const athletes = useQuery(api.athletes.list, {})

  const stageRef = useRef<Konva.Stage>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(teamImageSchema),
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
    if (!values.templateId) return
    setError(null)
    const validIds = values.athleteOrder.filter(
      (id): id is Id<"athletes"> => id !== null
    )
    setIsSaving(true)
    try {
      const created = await createTeamImage({
        templateId: values.templateId,
        layoutId: values.layoutId,
        name: values.name || `${fi.layouts[values.layoutId]} ${Date.now()}`,
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
      />

      <FormBase
        control={form.control}
        name="layoutId"
        label={fi.teams.fields.layout}
      >
        {(field) => (
          <LayoutRadioGroup value={field.value} onChange={onLayoutChange} />
        )}
      </FormBase>

      <FormSelect
        control={form.control}
        name="templateId"
        label={fi.teams.fields.template}
        placeholder={templatePlaceholder}
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
        />
      )}

      {otherSlots.map((slot) => (
        <FormInput
          key={slot.key}
          control={form.control}
          name={`textValues.${slot.key}`}
          label={slot.label}
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
            requiredCount={layout.requiredAthleteCount}
            onChange={field.onChange}
          />
        )}
      </FormBase>
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

  const selectedTemplate = templates?.find((t) => t._id === templateId) ?? null

  return (
    <FormActions
      error={error}
      isSaving={isSaving}
      canSave={true}
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
