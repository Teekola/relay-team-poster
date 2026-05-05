"use client"

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
  Controller,
  type UseFormReturn,
  useForm,
  useFormState,
  useWatch,
} from "react-hook-form"
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
import { TemplateSelect } from "@/components/teams/template-select"
import { TextSlotField } from "@/components/teams/text-slot-field"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { useHydrated } from "@/hooks/use-hydrated"
import { useOrderedAthletes } from "@/hooks/use-ordered-athletes"
import { LAYOUT_IDS, LAYOUTS, type Layout, type LayoutId } from "@/lib/layouts"
import { fi } from "@/messages/fi"

const LAYOUT_ID_SET: ReadonlySet<string> = new Set<string>(LAYOUT_IDS)

function isLayoutId(value: string): value is LayoutId {
  return LAYOUT_ID_SET.has(value)
}

const STAGE_DISPLAY_WIDTH = 540
const STAGE_PLACEHOLDER_ASPECT = 1

const PLACEHOLDER_TEXT_SLOTS = [
  { key: "_loading_event", label: "Tapahtuman nimi" },
  { key: "_loading_team", label: "Joukkueteksti" },
] as const

// Form-display order is intentionally decoupled from layout slot order
// (which controls Konva positioning) so switching layout doesn't reshuffle.
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

type FormValues = {
  name: string
  layoutId: LayoutId | null
  templateId: Id<"templates"> | null
  textValues: Record<string, string>
  athleteOrder: (Id<"athletes"> | null)[]
}

const EMPTY_DEFAULTS: FormValues = {
  name: "",
  layoutId: null,
  templateId: null,
  textValues: {},
  athleteOrder: [],
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
  const [hasInitialized, setHasInitialized] = useState(false)
  const [wasLoaded, setWasLoaded] = useState(false)

  const form = useForm<FormValues>({ defaultValues: EMPTY_DEFAULTS })

  useEffect(() => {
    if (teamImage) setWasLoaded(true)
  }, [teamImage])
  useEffect(() => {
    if (wasLoaded && teamImage === null) {
      router.replace("/teams")
    }
  }, [wasLoaded, teamImage, router])

  // RHF's defaultValues are mount-only, so reset() once the query resolves.
  useEffect(() => {
    if (!teamImage || hasInitialized) return
    if (!isLayoutId(teamImage.layoutId)) return
    const layout = LAYOUTS[teamImage.layoutId]
    form.reset({
      name: teamImage.name,
      layoutId: teamImage.layoutId,
      templateId: teamImage.templateId,
      textValues: withLayoutDefaults(layout, teamImage.textValues),
      athleteOrder: teamImage.athleteOrder,
    })
    setHasInitialized(true)
  }, [teamImage, hasInitialized, form])

  const layoutId = useWatch({ control: form.control, name: "layoutId" })
  const layout = layoutId ? LAYOUTS[layoutId] : null

  const templates = useQuery(
    api.templates.list,
    layout ? { aspect: layout.aspect } : "skip"
  )

  const hydrated = useHydrated()
  const isLoading = !hydrated || !hasInitialized
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
    setError(null)
    if (!values.layoutId) return
    if (!values.templateId) {
      setError("Valitse malli.")
      return
    }
    const validIds = values.athleteOrder.filter(
      (id): id is Id<"athletes"> => id !== null
    )
    const requiredCount = LAYOUTS[values.layoutId].requiredAthleteCount
    if (validIds.length !== requiredCount) {
      setError(
        fi.teams.errors.rosterIncomplete(requiredCount - validIds.length)
      )
      return
    }
    setIsSaving(true)
    try {
      const trimmedName = values.name.trim()
      await updateTeamImage({
        id: teamImageId,
        name: trimmedName,
        layoutId: values.layoutId,
        templateId: values.templateId,
        athleteOrder: validIds,
        textValues: values.textValues,
      })
      form.reset({ ...values, name: trimmedName }, { keepValues: true })
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
            layout={layout}
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

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="team-image-name">
          {fi.teams.fields.name}
        </FieldLabel>
        <Input
          id="team-image-name"
          {...form.register("name")}
          isLoading={isLoading}
        />
      </Field>

      <Controller
        control={form.control}
        name="layoutId"
        render={({ field }) => (
          <LayoutRadioGroup
            value={field.value}
            onChange={(value) => onLayoutChange(value, field.value)}
            isLoading={isLoading}
          />
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
            isLoading={isLoading}
          />
        )}
      />

      {eventSlot && (
        <TextSlotField
          slot={eventSlot}
          registration={form.register(`textValues.${eventSlot.key}`)}
          isLoading={isLoading}
        />
      )}

      {otherSlots.map((slot) => (
        <TextSlotField
          key={slot.key}
          slot={slot}
          registration={form.register(`textValues.${slot.key}`)}
          isLoading={isLoading}
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
              requiredCount={layout?.requiredAthleteCount ?? 0}
              onChange={field.onChange}
              isLoading={isLoading}
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
  layout,
  templates,
  stageRef,
  fallbackName,
  onSave,
}: {
  control: Control<FormValues>
  error: string | null
  isSaving: boolean
  isLoading: boolean
  layout: Layout | null
  templates: { _id: Id<"templates"> }[] | undefined
  stageRef: RefObject<Konva.Stage | null>
  fallbackName: string
  onSave: () => void
}) {
  const { isDirty } = useFormState({ control })
  const name = useWatch({ control, name: "name" })
  const templateId = useWatch({ control, name: "templateId" })
  const athleteOrder = useWatch({ control, name: "athleteOrder" })

  const rosterComplete =
    layout !== null &&
    athleteOrder.length === layout.requiredAthleteCount &&
    athleteOrder.every((id) => id !== null)
  const nameNonEmpty = name.trim().length > 0
  const canSave =
    isDirty && rosterComplete && templateId !== null && nameNonEmpty

  const selectedTemplate = templates?.find((t) => t._id === templateId) ?? null

  return (
    <FormActions
      error={error}
      isSaving={isSaving}
      isLoading={isLoading}
      canSave={canSave}
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
