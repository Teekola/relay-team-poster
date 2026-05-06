"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "convex/react"
import type Konva from "konva"
import { useRouter, useSearchParams } from "next/navigation"
import { type RefObject, useEffect, useMemo, useRef, useState } from "react"
import { type Control, useForm, useWatch } from "react-hook-form"
import { FormActions } from "@/components/forms/form-actions"
import { PageHeader } from "@/components/layout/page-header"
import { ExportButton } from "@/components/team-image/export-button"
import { TeamImageFormFields } from "@/components/teams/team-image-form-fields"
import { TeamImageStageSection } from "@/components/teams/team-image-stage-section"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { LAYOUTS, type LayoutId, withLayoutDefaults } from "@/lib/layouts"
import { useTeamDraftStore } from "@/lib/store/team-draft-store"
import {
  DEFAULT_LAYOUT_ID,
  teamImageFormSchema,
  type TeamImageFormValues,
} from "@/lib/team-image-form"
import { fi } from "@/messages/fi"

export default function NewTeamImagePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const createTeamImage = useMutation(api.teamImages.create)
  const athletes = useQuery(api.athletes.list, {})
  const draft = useTeamDraftStore((s) => s.draft)
  const clearDraft = useTeamDraftStore((s) => s.clearDraft)
  const shouldUseDraft = searchParams.get("draft") === "ai"

  const stageRef = useRef<Konva.Stage>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const emptyDefaults = useMemo<TeamImageFormValues>(
    () => ({
      name: "",
      layoutId: DEFAULT_LAYOUT_ID,
      templateId: null,
      textValues: withLayoutDefaults(LAYOUTS[DEFAULT_LAYOUT_ID], {}),
      athleteOrder: [],
    }),
    []
  )

  const form = useForm<TeamImageFormValues>({
    resolver: zodResolver(teamImageFormSchema),
    defaultValues: shouldUseDraft ? (draft ?? emptyDefaults) : emptyDefaults,
  })

  const layoutId = useWatch({ control: form.control, name: "layoutId" })
  const layout = layoutId ? LAYOUTS[layoutId] : LAYOUTS[DEFAULT_LAYOUT_ID]
  const templates = useQuery(api.templates.list, { aspect: layout.aspect })

  useEffect(() => {
    if (!draft) return
    if (!shouldUseDraft) {
      clearDraft()
      return
    }
    form.reset(draft)
    clearDraft()
    router.replace("/teams/new")
  }, [draft, shouldUseDraft, clearDraft, form, router])

  useEffect(() => {
    if (!templates || templates.length === 0) return
    if (form.getValues("templateId") !== null) return
    form.setValue("templateId", templates[0]._id, { shouldDirty: false })
  }, [templates, form])

  function handleLayoutChange(value: LayoutId) {
    const current = form.getValues("layoutId")
    if (value === current) return
    form.setValue("layoutId", value)
    form.setValue("templateId", null)
    form.setValue("athleteOrder", [])
    const currentText = form.getValues("textValues")
    form.setValue("textValues", withLayoutDefaults(LAYOUTS[value], currentText))
  }

  const handleSave = form.handleSubmit(async (values) => {
    if (!values.templateId || !values.layoutId) return
    setError(null)
    const validIds = values.athleteOrder.filter(
      (id): id is Id<"athletes"> => id !== null
    )
    setIsSaving(true)
    try {
      const created = await createTeamImage({
        templateId: values.templateId,
        layoutId: values.layoutId,
        name: values.name,
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
          <TeamImageFormFields
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
            templates={templates}
            stageRef={stageRef}
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

function FormActionsSection({
  control,
  error,
  isSaving,
  templates,
  stageRef,
  onSave,
}: {
  control: Control<TeamImageFormValues>
  error: string | null
  isSaving: boolean
  templates: { _id: Id<"templates"> }[] | undefined
  stageRef: RefObject<Konva.Stage | null>
  onSave: () => void
}) {
  const name = useWatch({ control, name: "name" })
  const layoutId = useWatch({ control, name: "layoutId" })
  const templateId = useWatch({ control, name: "templateId" })

  const selectedTemplate = templates?.find((t) => t._id === templateId) ?? null
  const layoutLabel = layoutId ? fi.layouts[layoutId] : ""

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
          filename={(name.trim() || layoutLabel || "team").replace(/\s+/g, "_")}
          disabled={!selectedTemplate}
        />
      }
    />
  )
}
