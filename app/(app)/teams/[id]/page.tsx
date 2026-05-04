"use client"

import { useMutation, useQuery } from "convex/react"
import type Konva from "konva"
import { notFound, useParams, useRouter } from "next/navigation"
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
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
import type { Id } from "@/convex/_generated/dataModel"
import { useHydrated } from "@/hooks/use-hydrated"
import { useOrderedAthletes } from "@/hooks/use-ordered-athletes"
import { LAYOUT_IDS, LAYOUTS, type LayoutId } from "@/lib/layouts"
import { fi } from "@/messages/fi"

const LAYOUT_ID_SET: ReadonlySet<string> = new Set<string>(LAYOUT_IDS)

function isLayoutId(value: string): value is LayoutId {
  return LAYOUT_ID_SET.has(value)
}

const STAGE_DISPLAY_WIDTH = 540
const STAGE_PLACEHOLDER_ASPECT = 1

// Rendered while the real layout is still loading so the form's field count
// and vertical rhythm stay stable. Labels may shift after load; height won't.
const PLACEHOLDER_TEXT_SLOTS = [
  { key: "_loading_event", label: "Tapahtuman nimi", defaultValue: "" },
  { key: "_loading_team", label: "Joukkueteksti", defaultValue: "" },
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

export default function EditTeamImagePage() {
  const params = useParams<{ id: string }>()
  const teamImageId = params.id as Id<"teamImages">
  const router = useRouter()

  const teamImage = useQuery(api.teamImages.get, { id: teamImageId })
  const updateTeamImage = useMutation(api.teamImages.update)
  const duplicateTeamImage = useMutation(api.teamImages.duplicate)
  const [isDuplicating, setIsDuplicating] = useState(false)

  const stageRef = useRef<Konva.Stage>(null)
  const [name, setName] = useState("")
  const [layoutId, setLayoutId] = useState<LayoutId | null>(null)
  const [templateId, setTemplateId] = useState<Id<"templates"> | null>(null)
  const [textValues, setTextValues] = useState<Record<string, string>>({})
  const [athleteOrder, setAthleteOrder] = useState<(Id<"athletes"> | null)[]>(
    []
  )
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const initialSnapshotRef = useRef<{
    name: string
    layoutId: LayoutId
    templateId: Id<"templates">
    textValues: Record<string, string>
    athleteOrder: (Id<"athletes"> | null)[]
  } | null>(null)
  const [wasLoaded, setWasLoaded] = useState(false)
  useEffect(() => {
    if (teamImage) setWasLoaded(true)
  }, [teamImage])
  useEffect(() => {
    if (wasLoaded && teamImage === null) {
      router.replace("/teams")
    }
  }, [wasLoaded, teamImage, router])

  const layout = useMemo(() => {
    if (!layoutId) return null
    return LAYOUTS[layoutId]
  }, [layoutId])

  const templates = useQuery(
    api.templates.list,
    layout ? { aspect: layout.aspect } : "skip"
  )
  const athletes = useQuery(api.athletes.list, {})

  useEffect(() => {
    if (!teamImage || hasInitialized) return
    if (!isLayoutId(teamImage.layoutId)) return
    setLayoutId(teamImage.layoutId)
    setName(teamImage.name)
    setTemplateId(teamImage.templateId)
    setTextValues(teamImage.textValues)
    setAthleteOrder(teamImage.athleteOrder)
    initialSnapshotRef.current = {
      name: teamImage.name,
      layoutId: teamImage.layoutId,
      templateId: teamImage.templateId,
      textValues: teamImage.textValues,
      athleteOrder: teamImage.athleteOrder,
    }
    setHasInitialized(true)
  }, [teamImage, hasInitialized])

  function handleLayoutChange(value: LayoutId) {
    if (value === layoutId) return
    const nextLayout = LAYOUTS[value]
    setLayoutId(value)
    if (layout && nextLayout.aspect !== layout.aspect) {
      setTemplateId(null)
    }
    setAthleteOrder((prev) => {
      const next: (Id<"athletes"> | null)[] = prev.slice(
        0,
        nextLayout.requiredAthleteCount
      )
      while (next.length < nextLayout.requiredAthleteCount) {
        next.push(null)
      }
      return next
    })
  }

  const selectedTemplate = useMemo(() => {
    if (!templateId || !templates) return null
    return templates.find((t) => t._id === templateId) ?? null
  }, [templateId, templates])

  const deferredTextValues = useDeferredValue(textValues)
  const orderedAthletes = useOrderedAthletes(athleteOrder, athletes)

  const isDirty = useMemo(() => {
    const snap = initialSnapshotRef.current
    if (!snap) return false
    if (snap.name !== name) return true
    if (snap.layoutId !== layoutId) return true
    if (snap.templateId !== templateId) return true
    if (snap.athleteOrder.length !== athleteOrder.length) return true
    for (let i = 0; i < athleteOrder.length; i++) {
      if (snap.athleteOrder[i] !== athleteOrder[i]) return true
    }
    const snapKeys = Object.keys(snap.textValues)
    const curKeys = Object.keys(textValues)
    if (snapKeys.length !== curKeys.length) return true
    for (const key of curKeys) {
      if (snap.textValues[key] !== textValues[key]) return true
    }
    return false
  }, [name, layoutId, templateId, textValues, athleteOrder])

  const rosterComplete =
    layoutId !== null &&
    athleteOrder.length === LAYOUTS[layoutId].requiredAthleteCount &&
    athleteOrder.every((id) => id !== null)
  const nameNonEmpty = name.trim().length > 0
  const canSave =
    isDirty && rosterComplete && templateId !== null && nameNonEmpty

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

  const hydrated = useHydrated()
  const isLoading = !hydrated || !hasInitialized
  const layoutUnknown =
    teamImage !== undefined &&
    teamImage !== null &&
    !isLayoutId(teamImage.layoutId)

  // notFound only on cold load; later disappearance redirects via effect.
  if (teamImage === null && !wasLoaded) {
    notFound()
  }

  async function handleSave() {
    if (!layout || !layoutId) return
    setError(null)

    if (!templateId) {
      setError("Valitse malli.")
      return
    }
    const validIds = athleteOrder.filter(
      (id): id is Id<"athletes"> => id !== null
    )
    if (validIds.length !== layout.requiredAthleteCount) {
      setError(
        fi.teams.errors.rosterIncomplete(
          layout.requiredAthleteCount - validIds.length
        )
      )
      return
    }

    setIsSaving(true)
    try {
      await updateTeamImage({
        id: teamImageId,
        name: name.trim(),
        layoutId,
        templateId,
        athleteOrder: validIds,
        textValues,
      })
      initialSnapshotRef.current = {
        name: name.trim(),
        layoutId,
        templateId,
        textValues,
        athleteOrder,
      }
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Tallennus epäonnistui."
      )
    } finally {
      setIsSaving(false)
    }
  }

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
      <PageHeader
        parent={{ href: "/teams", label: fi.teams.title }}
        current={name || teamImage?.name || ""}
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
              onClick={handleDuplicate}
              disabled={isDuplicating || isLoading}
            >
              {fi.teams.actions.duplicate}
            </Button>
            <DeleteTeamImageButton
              teamImageId={teamImageId}
              teamImageName={teamImage?.name ?? ""}
              isLoading={isLoading}
            />
          </>
        }
      />

      {layoutUnknown && (
        <p className="text-destructive">
          Tuntematon asettelu: {teamImage?.layoutId}
        </p>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <FieldGroup>
            {eventSlot && (
              <TextSlotField
                slot={eventSlot}
                values={textValues}
                setValues={setTextValues}
                isLoading={isLoading}
              />
            )}

            <LayoutRadioGroup
              value={layoutId}
              onChange={handleLayoutChange}
              isLoading={isLoading}
            />

            <Field>
              <FieldLabel htmlFor="team-image-name">
                {fi.teams.fields.name}
              </FieldLabel>
              <Input
                id="team-image-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                isLoading={isLoading}
              />
            </Field>

            <TemplateSelect
              templates={templates}
              value={templateId}
              onChange={setTemplateId}
              isLoading={isLoading}
            />

            {otherSlots.map((slot) => (
              <TextSlotField
                key={slot.key}
                slot={slot}
                values={textValues}
                setValues={setTextValues}
                isLoading={isLoading}
              />
            ))}
            <Field>
              <FieldLabel>{fi.teams.fields.roster}</FieldLabel>
              <RosterPicker
                athletes={athletes}
                selected={athleteOrder}
                requiredCount={layout?.requiredAthleteCount ?? 0}
                onChange={setAthleteOrder}
                isLoading={isLoading}
              />
            </Field>
          </FieldGroup>

          <FormActions
            error={error}
            isSaving={isSaving}
            isLoading={isLoading}
            canSave={canSave}
            saveLabel={fi.teams.actions.save}
            onSave={handleSave}
            extraButtons={
              <ExportButton
                stageRef={stageRef}
                filename={(name.trim() || teamImage?.name || "team").replace(
                  /\s+/g,
                  "_"
                )}
                disabled={isLoading || !selectedTemplate}
              />
            }
          />
        </div>

        <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          {layout ? (
            <ResponsiveTeamImageStage
              stageRef={stageRef}
              layout={layout}
              backgroundUrl={selectedTemplate?.backgroundUrl ?? null}
              athletes={orderedAthletes}
              textValues={deferredTextValues}
              maxWidth={STAGE_DISPLAY_WIDTH}
            />
          ) : (
            <TeamImageStagePlaceholder
              width={STAGE_DISPLAY_WIDTH}
              aspectRatio={STAGE_PLACEHOLDER_ASPECT}
            />
          )}
        </div>
      </div>
    </div>
  )
}
