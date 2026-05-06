"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "convex/react"
import type Konva from "konva"
import { notFound, useParams, useRouter } from "next/navigation"
import { type RefObject, useEffect, useMemo, useRef, useState } from "react"
import { type Control, useForm, useFormState, useWatch } from "react-hook-form"
import { FormActions } from "@/components/forms/form-actions"
import { PageHeader } from "@/components/layout/page-header"
import { ExportButton } from "@/components/team-image/export-button"
import { DeleteTeamImageButton } from "@/components/teams/delete-team-image-button"
import { TeamImageFormFields } from "@/components/teams/team-image-form-fields"
import { TeamImageStageSection } from "@/components/teams/team-image-stage-section"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useHydrated } from "@/hooks/use-hydrated"
import {
  isLayoutId,
  LAYOUTS,
  type Layout,
  type LayoutId,
  withLayoutDefaults,
} from "@/lib/layouts"
import {
  teamImageFormSchema,
  type TeamImageFormValues,
} from "@/lib/team-image-form"
import { fi } from "@/messages/fi"

const EMPTY_DEFAULTS: TeamImageFormValues = {
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

  const formValues = useMemo<TeamImageFormValues | undefined>(() => {
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

  const form = useForm<TeamImageFormValues>({
    resolver: zodResolver(teamImageFormSchema),
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

  function handleLayoutChange(value: LayoutId) {
    const current = form.getValues("layoutId")
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
          <TeamImageFormFields
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
          <TeamImageStageSection
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
  control: Control<TeamImageFormValues>
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
  control: Control<TeamImageFormValues>
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
