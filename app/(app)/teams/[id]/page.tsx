"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "convex/react"
import type Konva from "konva"
import { notFound, useParams, useRouter } from "next/navigation"
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
  useFormState,
  useWatch,
} from "react-hook-form"
import { z } from "zod"
import { FormActions } from "@/components/forms/form-actions"
import { PageHeader } from "@/components/layout/page-header"
import { ExportButton } from "@/components/team-image/export-button"
import {
  ResponsiveTeamImageStage,
  TeamImageStagePlaceholder,
} from "@/components/team-image/team-image-stage"
import { DeleteTeamImageButton } from "@/components/teams/delete-team-image-button"
import { LayoutRadioGroup } from "@/components/teams/layout-radio-group"
import { RosterPicker } from "@/components/teams/roster-picker"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { FormBase, FormInput, FormSelect } from "@/components/ui/form-fields"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { useHydrated } from "@/hooks/use-hydrated"
import { useOrderedAthletes } from "@/hooks/use-ordered-athletes"
import {
  isLayoutId,
  LAYOUT_IDS,
  LAYOUTS,
  type Layout,
  type LayoutId,
  withLayoutDefaults,
} from "@/lib/layouts"
import { fi } from "@/messages/fi"

const STAGE_DISPLAY_WIDTH = 540
const STAGE_PLACEHOLDER_ASPECT = 1

const PLACEHOLDER_TEXT_SLOTS = [
  { key: "_loading_event", label: "Tapahtuman nimi" },
  { key: "_loading_team", label: "Joukkueteksti" },
] as const

const TEXT_SLOT_PRIORITY: Record<string, number> = {
  eventName: 0,
  teamLabel: 1,
  teamName: 1,
}

function compareTextSlots<T extends { key: string }>(a: T, b: T): number {
  const aPriority = TEXT_SLOT_PRIORITY[a.key] ?? 99
  const bPriority = TEXT_SLOT_PRIORITY[b.key] ?? 99
  if (aPriority !== bPriority) return aPriority - bPriority
  return a.key.localeCompare(b.key)
}

const teamImageSchema = z
  .object({
    name: z.string().trim().min(1, fi.common.requiredField),
    layoutId: z
      .enum(LAYOUT_IDS as readonly [LayoutId, ...LayoutId[]])
      .nullable(),
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
    if (data.layoutId === null) {
      ctx.addIssue({
        code: "custom",
        message: fi.common.requiredField,
        path: ["layoutId"],
      })
    }
    if (data.templateId === null) {
      ctx.addIssue({
        code: "custom",
        message: fi.teams.errors.templateRequired,
        path: ["templateId"],
      })
    }
  })

type FormValues = z.infer<typeof teamImageSchema>

const EMPTY_DEFAULTS: FormValues = {
  name: "",
  layoutId: null,
  templateId: null,
  textValues: {},
  athleteOrder: [],
}

export default function EditTeamImagePage() {
  const params = useParams<{ id: string }>()
  const teamImageId = params.id as Id<"teamImages">
  const router = useRouter()

  const teamImage = useQuery(api.teamImages.get, { id: teamImageId })
  const updateTeamImage = useMutation(api.teamImages.update)
  const duplicateTeamImage = useMutation(api.teamImages.duplicate)
  const athletes = useQuery(api.athletes.list, {})
  const [isDuplicating, setIsDuplicating] = useState(false)

  const stageRef = useRef<Konva.Stage>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [wasLoaded, setWasLoaded] = useState(false)

  const formValues = useMemo<FormValues | undefined>(() => {
    if (!teamImage || !isLayoutId(teamImage.layoutId)) return undefined
    const layout = LAYOUTS[teamImage.layoutId]
    return {
      name: teamImage.name,
      layoutId: teamImage.layoutId,
      templateId: teamImage.templateId,
      textValues: withLayoutDefaults(layout, teamImage.textValues),
      athleteOrder: teamImage.athleteOrder,
    }
  }, [teamImage])

  const form = useForm<FormValues>({
    resolver: zodResolver(teamImageSchema),
    defaultValues: EMPTY_DEFAULTS,
    values: formValues,
    resetOptions: { keepDirtyValues: true },
  })

  useEffect(() => {
    if (teamImage) setWasLoaded(true)
  }, [teamImage])
  useEffect(() => {
    if (wasLoaded && teamImage === null) {
      router.replace("/teams")
    }
  }, [wasLoaded, teamImage, router])

  const layoutId = useWatch({ control: form.control, name: "layoutId" })
  const layout = layoutId ? LAYOUTS[layoutId] : null

  const templates = useQuery(
    api.templates.list,
    layout ? { aspect: layout.aspect } : "skip"
  )

  const hydrated = useHydrated()
  const isLoading =
    !hydrated || teamImage === undefined || formValues === undefined
  const layoutUnknown =
    teamImage !== undefined &&
    teamImage !== null &&
    !isLayoutId(teamImage.layoutId)

  if (teamImage === null && !wasLoaded) {
    notFound()
  }

  function handleLayoutChange(value: LayoutId, current: LayoutId | null) {
    if (value === current) return
    const nextLayout = LAYOUTS[value]
    const currentLayout = current ? LAYOUTS[current] : null
    form.setValue("layoutId", value, { shouldDirty: true })
    if (currentLayout && nextLayout.aspect !== currentLayout.aspect) {
      form.setValue("templateId", null, { shouldDirty: true })
    }
    const currentOrder = form.getValues("athleteOrder")
    const next: (Id<"athletes"> | null)[] = currentOrder.slice(
      0,
      nextLayout.requiredAthleteCount
    )
    while (next.length < nextLayout.requiredAthleteCount) next.push(null)
    form.setValue("athleteOrder", next, { shouldDirty: true })
    const currentText = form.getValues("textValues")
    form.setValue("textValues", withLayoutDefaults(nextLayout, currentText), {
      shouldDirty: true,
    })
  }

  const handleSave = form.handleSubmit(async (values) => {
    if (!values.layoutId || !values.templateId) return
    setError(null)
    setIsSaving(true)
    try {
      await updateTeamImage({
        id: teamImageId,
        name: values.name,
        layoutId: values.layoutId,
        templateId: values.templateId,
        athleteOrder: values.athleteOrder,
        textValues: values.textValues,
      })
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Tallennus epäonnistui."
      )
    } finally {
      setIsSaving(false)
    }
  })

  async function handleDuplicate() {
    setIsDuplicating(true)
    try {
      const newId = await duplicateTeamImage({ id: teamImageId })
      router.push(`/teams/${newId}`)
    } finally {
      setIsDuplicating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSection
        control={form.control}
        fallbackName={teamImage?.name ?? ""}
        isLoading={isLoading}
        layout={layout}
        isDuplicating={isDuplicating}
        onDuplicate={handleDuplicate}
        teamImageId={teamImageId}
        teamImageName={teamImage?.name ?? ""}
      />

      {layoutUnknown && (
        <p className="text-destructive">
          Tuntematon asettelu: {teamImage?.layoutId}
        </p>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <FormFields
            form={form}
            layout={layout}
            templates={templates}
            athletes={athletes}
            isLoading={isLoading}
            onLayoutChange={handleLayoutChange}
          />

          <FormActionsSection
            control={form.control}
            error={error}
            isSaving={isSaving}
            isLoading={isLoading}
            templates={templates}
            stageRef={stageRef}
            fallbackName={teamImage?.name ?? ""}
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

function PageHeaderSection({
  control,
  fallbackName,
  isLoading,
  layout,
  isDuplicating,
  onDuplicate,
  teamImageId,
  teamImageName,
}: {
  control: Control<FormValues>
  fallbackName: string
  isLoading: boolean
  layout: Layout | null
  isDuplicating: boolean
  onDuplicate: () => void
  teamImageId: Id<"teamImages">
  teamImageName: string
}) {
  const name = useWatch({ control, name: "name" })
  return (
    <PageHeader
      parent={{ href: "/teams", label: fi.teams.title }}
      current={name || fallbackName}
      isLoading={isLoading}
      titleSuffix={
        layout && (
          <span className="text-muted-foreground text-sm">
            {fi.layouts[layout.id]}
          </span>
        )
      }
      actions={
        <>
          <Button
            variant="outline"
            onClick={onDuplicate}
            disabled={isDuplicating || isLoading}
          >
            {fi.teams.actions.duplicate}
          </Button>
          <DeleteTeamImageButton
            teamImageId={teamImageId}
            teamImageName={teamImageName}
            isLoading={isLoading}
          />
        </>
      }
    />
  )
}

function FormFields({
  form,
  layout,
  templates,
  athletes,
  isLoading,
  onLayoutChange,
}: {
  form: UseFormReturn<FormValues>
  layout: Layout | null
  templates: { _id: Id<"templates">; name: string }[] | undefined
  athletes: (Doc<"athletes"> & { imageUrl: string | null })[] | undefined
  isLoading: boolean
  onLayoutChange: (value: LayoutId, current: LayoutId | null) => void
}) {
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
            onChange={(value) => onLayoutChange(value, field.value)}
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

  const layout = layoutId ? LAYOUTS[layoutId] : null
  const selectedTemplate = useMemo(() => {
    if (!templateId || !templates) return null
    return templates.find((t) => t._id === templateId) ?? null
  }, [templateId, templates])
  const orderedAthletes = useOrderedAthletes(athleteOrder ?? [], athletes)
  const deferredTextValues = useDeferredValue(textValues ?? {})

  if (!layout) {
    return (
      <TeamImageStagePlaceholder
        width={STAGE_DISPLAY_WIDTH}
        aspectRatio={STAGE_PLACEHOLDER_ASPECT}
      />
    )
  }
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
  isLoading,
  templates,
  stageRef,
  fallbackName,
  onSave,
}: {
  control: Control<FormValues>
  error: string | null
  isSaving: boolean
  isLoading: boolean
  templates: { _id: Id<"templates"> }[] | undefined
  stageRef: RefObject<Konva.Stage | null>
  fallbackName: string
  onSave: () => void
}) {
  const { isDirty } = useFormState({ control })
  const name = useWatch({ control, name: "name" })
  const templateId = useWatch({ control, name: "templateId" })

  const selectedTemplate = templates?.find((t) => t._id === templateId) ?? null

  return (
    <FormActions
      error={error}
      isSaving={isSaving}
      isLoading={isLoading}
      canSave={isDirty}
      saveLabel={fi.teams.actions.save}
      onSave={onSave}
      extraButtons={
        <ExportButton
          stageRef={stageRef}
          filename={(name.trim() || fallbackName || "team").replace(
            /\s+/g,
            "_"
          )}
          disabled={isLoading || !selectedTemplate}
        />
      }
    />
  )
}
