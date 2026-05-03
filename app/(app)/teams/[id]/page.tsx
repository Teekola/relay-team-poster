"use client"

import { useMutation, useQuery } from "convex/react"
import type Konva from "konva"
import { notFound, useParams, useRouter } from "next/navigation"
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { ExportButton } from "@/components/team-image/export-button"
import {
  TeamImageStage,
  TeamImageStagePlaceholder,
} from "@/components/team-image/team-image-stage"
import { DeleteTeamImageButton } from "@/components/teams/delete-team-image-button"
import { RosterPicker } from "@/components/teams/roster-picker"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useHydrated } from "@/hooks/use-hydrated"
import { LAYOUT_IDS, LAYOUTS, type LayoutId } from "@/lib/layouts"
import { cn } from "@/lib/utils"
import { fi } from "@/messages/fi"

const LAYOUT_ID_SET: ReadonlySet<string> = new Set<string>(LAYOUT_IDS)

function isLayoutId(value: string): value is LayoutId {
  return LAYOUT_ID_SET.has(value)
}

const STAGE_DISPLAY_WIDTH = 540
// Default aspect for the canvas placeholder before the layout is known —
// matches the most common layout (square 3000×3000).
const STAGE_PLACEHOLDER_ASPECT = 1

// Placeholder text slot definitions used until the actual layout has loaded.
// Every layout in the system has exactly two text slots (event + team), so
// rendering these during loading keeps the form's vertical rhythm stable.
// The labels may shift slightly after load (e.g. "Joukkueteksti" →
// "Joukkueen nimi") but height and field count don't.
const PLACEHOLDER_TEXT_SLOTS = [
  { key: "_loading_event", label: "Tapahtuman nimi", defaultValue: "" },
  { key: "_loading_team", label: "Joukkueteksti", defaultValue: "" },
] as const

// Canonical display order for text slots — rendered in the same order
// regardless of which layout the user picks. Layout files declare slots in
// layout-specific order (which controls Konva positioning) but the form
// shouldn't reshuffle when the user switches layouts.
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

  function handleLayoutChange(value: string) {
    if (!isLayoutId(value)) return
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
  const deferredAthleteOrder = useDeferredValue(athleteOrder)

  const orderedAthletes = useMemo(() => {
    if (!athletes) return []
    return deferredAthleteOrder.map((id) => {
      if (!id) return null
      return athletes.find((a) => a._id === id) ?? null
    })
  }, [deferredAthleteOrder, athletes])

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

  // Page-level loading: data hasn't seeded local state yet.
  const hydrated = useHydrated()
  const isLoading = !hydrated || !hasInitialized
  // Hard-error case: layoutId from the record isn't recognised.
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

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/teams">{fi.teams.title}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage
              className={cn(
                "wrap-anywhere",
                isLoading && "h-lh w-14 animate-pulse rounded-md bg-muted"
              )}
            >
              {teamImage?.name ?? ""}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Skeleton className="h-8 w-56 rounded-md" />
          ) : (
            <>
              <h1 className="font-medium text-2xl">
                {name || teamImage?.name}
              </h1>
              {layout && (
                <span className="text-muted-foreground text-sm">
                  {fi.layouts[layout.id]}
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              setIsDuplicating(true)
              try {
                const newId = await duplicateTeamImage({
                  id: teamImageId,
                })
                router.push(`/teams/${newId}`)
              } finally {
                setIsDuplicating(false)
              }
            }}
            disabled={isDuplicating || isLoading}
          >
            {fi.teams.actions.duplicate}
          </Button>
          <DeleteTeamImageButton
            teamImageId={teamImageId}
            teamImageName={teamImage?.name ?? ""}
            isLoading={isLoading}
          />
        </div>
      </header>

      {layoutUnknown && (
        <p className="text-destructive">
          Tuntematon asettelu: {teamImage?.layoutId}
        </p>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <FieldGroup>
            <Field>
              <FieldLabel>{fi.teams.fields.layout}</FieldLabel>
              <RadioGroup
                value={layoutId ?? ""}
                onValueChange={(value) => {
                  if (typeof value === "string") handleLayoutChange(value)
                }}
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                isLoading={isLoading}
              >
                {LAYOUT_IDS.map((id) => (
                  <Label
                    key={id}
                    className="flex cursor-pointer items-center gap-2 font-normal text-sm"
                  >
                    <RadioGroupItem value={id} />
                    {fi.layouts[id]}
                  </Label>
                ))}
              </RadioGroup>
            </Field>

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

            <Field>
              <FieldLabel>{fi.teams.fields.template}</FieldLabel>
              <Select
                value={templateId}
                disabled={
                  isLoading || templates === undefined || templates.length === 0
                }
                onValueChange={(value) =>
                  setTemplateId(value as Id<"templates"> | null)
                }
              >
                <SelectTrigger isLoading={isLoading} className="w-full">
                  <SelectValue
                    placeholder={
                      templates === undefined
                        ? fi.common.loading
                        : templates.length === 0
                          ? fi.templates.empty
                          : fi.teams.fields.template
                    }
                  >
                    {(value) =>
                      templates?.find((t) => t._id === value)?.name ?? null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(templates ?? []).map((template) => (
                    <SelectItem key={template._id} value={template._id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Every layout has exactly two text slots (event +
                team). When loading, render real labels rather than
                skeletons — the actual `slot.label` may shift between
                "Joukkueteksti" / "Joukkueen nimi" depending on layout, but
                the field height stays stable either way. */}
            {(layout
              ? [...layout.textSlots].sort(compareTextSlots)
              : PLACEHOLDER_TEXT_SLOTS
            ).map((slot) => (
              <Field key={slot.key}>
                <FieldLabel htmlFor={`text-${slot.key}`}>
                  {slot.label}
                </FieldLabel>
                <Input
                  id={`text-${slot.key}`}
                  value={textValues[slot.key] ?? slot.defaultValue ?? ""}
                  onChange={(event) =>
                    setTextValues((prev) => ({
                      ...prev,
                      [slot.key]: event.target.value,
                    }))
                  }
                  isLoading={isLoading}
                />
              </Field>
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

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSave}
              disabled={isLoading || isSaving || !canSave}
            >
              {isSaving && <Spinner />}
              {isSaving ? fi.common.saving : fi.teams.actions.save}
            </Button>
            <ExportButton
              stageRef={stageRef}
              filename={(name.trim() || teamImage?.name || "team").replace(
                /\s+/g,
                "_"
              )}
              disabled={isLoading || !selectedTemplate}
            />
          </div>
        </div>

        {/* Right-align the canvas in its column so its right edge lines up
            with the action buttons in the header above. */}
        <div className="lg:sticky lg:top-6 lg:ml-auto lg:self-start">
          {layout ? (
            <TeamImageStage
              stageRef={stageRef}
              layout={layout}
              backgroundUrl={selectedTemplate?.backgroundUrl ?? null}
              athletes={orderedAthletes}
              textValues={deferredTextValues}
              displayWidth={Math.min(STAGE_DISPLAY_WIDTH, layout.canvas.w)}
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
