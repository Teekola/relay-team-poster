"use client"

import { useMutation, useQuery } from "convex/react"
import type Konva from "konva"
import { useRouter } from "next/navigation"
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
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
import type { Id } from "@/convex/_generated/dataModel"
import { LAYOUTS, type LayoutId } from "@/lib/layouts"
import { fi } from "@/messages/fi"

export default function NewTeamImagePage() {
  const router = useRouter()
  const createTeamImage = useMutation(api.teamImages.create)

  const stageRef = useRef<Konva.Stage>(null)
  const [layoutId, setLayoutId] = useState<LayoutId>("relay3")
  const [templateId, setTemplateId] = useState<Id<"templates"> | null>(null)
  const [name, setName] = useState("")
  const [textValues, setTextValues] = useState<Record<string, string>>({})
  const [athleteOrder, setAthleteOrder] = useState<(Id<"athletes"> | null)[]>(
    []
  )
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const layout = LAYOUTS[layoutId]
  const templates = useQuery(api.templates.list, { aspect: layout.aspect })
  const athletes = useQuery(api.athletes.list, {})

  const selectedTemplate = useMemo(() => {
    if (!templateId || !templates) return null
    return templates.find((t) => t._id === templateId) ?? null
  }, [templateId, templates])

  useEffect(() => {
    if (templateId === null && templates && templates.length > 0) {
      setTemplateId(templates[0]._id)
    }
  }, [templates, templateId])

  const deferredTextValues = useDeferredValue(textValues)
  const deferredAthleteOrder = useDeferredValue(athleteOrder)

  // Preserve positional alignment: index N here MUST match slot index N in
  // the layout. Empty/missing slots are kept as null so the stage skips them
  // without shifting later athletes leftward.
  const orderedAthletes = useMemo(() => {
    if (!athletes) return []
    return deferredAthleteOrder.map((id) => {
      if (!id) return null
      return athletes.find((a) => a._id === id) ?? null
    })
  }, [deferredAthleteOrder, athletes])

  const rosterComplete =
    athleteOrder.length === layout.requiredAthleteCount &&
    athleteOrder.every((id) => id !== null)
  const canSave = rosterComplete && templateId !== null

  const eventSlot = layout.textSlots.find((s) => s.key === "eventName")
  const otherSlots = layout.textSlots.filter((s) => s.key !== "eventName")

  function handleLayoutChange(value: LayoutId) {
    setLayoutId(value)
    setTemplateId(null)
    setAthleteOrder([])
  }

  async function handleSave() {
    setError(null)
    if (!templateId) {
      setError("Valitse malli.")
      return
    }
    if (athleteOrder.some((id) => id === null)) {
      const missing = athleteOrder.filter((id) => id === null).length
      const remaining = layout.requiredAthleteCount - athleteOrder.length
      setError(fi.teams.errors.rosterIncomplete(missing + remaining))
      return
    }
    if (athleteOrder.length < layout.requiredAthleteCount) {
      setError(
        fi.teams.errors.rosterIncomplete(
          layout.requiredAthleteCount - athleteOrder.length
        )
      )
      return
    }

    const validIds = athleteOrder.filter(
      (id): id is Id<"athletes"> => id !== null
    )

    setIsSaving(true)
    try {
      const created = await createTeamImage({
        templateId,
        layoutId,
        name: name.trim() || `${fi.layouts[layoutId]} ${Date.now()}`,
        athleteOrder: validIds,
        textValues,
      })
      router.push(`/teams/${created}`)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Tallennus epäonnistui."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        parent={{ href: "/teams", label: fi.teams.title }}
        current={fi.teams.new}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <FieldGroup>
            {eventSlot && (
              <TextSlotField
                slot={eventSlot}
                values={textValues}
                setValues={setTextValues}
              />
            )}

            <LayoutRadioGroup value={layoutId} onChange={handleLayoutChange} />

            <TemplateSelect
              templates={templates}
              value={templateId}
              onChange={setTemplateId}
            />

            <Field>
              <FieldLabel htmlFor="team-image-name">
                {fi.teams.fields.name}
              </FieldLabel>
              <Input
                id="team-image-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>

            {otherSlots.map((slot) => (
              <TextSlotField
                key={slot.key}
                slot={slot}
                values={textValues}
                setValues={setTextValues}
              />
            ))}

            <Field>
              <FieldLabel>{fi.teams.fields.roster}</FieldLabel>
              <RosterPicker
                athletes={athletes}
                selected={athleteOrder}
                requiredCount={layout.requiredAthleteCount}
                onChange={setAthleteOrder}
              />
            </Field>
          </FieldGroup>

          <FormActions
            error={error}
            isSaving={isSaving}
            canSave={canSave}
            saveLabel={fi.teams.actions.save}
            onSave={handleSave}
            extraButtons={
              <ExportButton
                stageRef={stageRef}
                filename={(name.trim() || fi.layouts[layoutId]).replace(
                  /\s+/g,
                  "_"
                )}
                disabled={!selectedTemplate}
              />
            }
          />
        </div>

        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <ResponsiveTeamImageStage
            stageRef={stageRef}
            layout={layout}
            backgroundUrl={selectedTemplate?.backgroundUrl ?? null}
            athletes={orderedAthletes}
            textValues={deferredTextValues}
            maxWidth={540}
          />
        </div>
      </div>
    </div>
  )
}
