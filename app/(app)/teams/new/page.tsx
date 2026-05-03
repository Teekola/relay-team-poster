"use client"

import { useMutation, useQuery } from "convex/react"
import type Konva from "konva"
import { useRouter } from "next/navigation"
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import { ExportButton } from "@/components/team-image/export-button"
import { TeamImageStage } from "@/components/team-image/team-image-stage"
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
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { LAYOUT_IDS, LAYOUTS, type LayoutId } from "@/lib/layouts"
import { fi } from "@/messages/fi"

const LAYOUT_ID_SET: ReadonlySet<string> = new Set<string>(LAYOUT_IDS)

function isLayoutId(value: string): value is LayoutId {
  return LAYOUT_ID_SET.has(value)
}

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

  function handleLayoutChange(value: string) {
    if (!isLayoutId(value)) return
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
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/teams">{fi.teams.title}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{fi.teams.new}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <header className="flex items-center justify-between">
        <h1 className="font-medium text-2xl">{fi.teams.new}</h1>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <FieldGroup>
            <Field>
              <FieldLabel>{fi.teams.fields.layout}</FieldLabel>
              <RadioGroup
                value={layoutId}
                onValueChange={(value) => {
                  if (typeof value === "string") handleLayoutChange(value)
                }}
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
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
              <FieldLabel>{fi.teams.fields.template}</FieldLabel>
              <Select
                value={templateId}
                onValueChange={(value) =>
                  setTemplateId(value as Id<"templates"> | null)
                }
              >
                <SelectTrigger>
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

            {layout.textSlots.map((slot) => (
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
                />
              </Field>
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

          {error && <p className="text-destructive text-sm">{error}</p>}

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={isSaving || !canSave}>
              {isSaving && <Spinner />}
              {isSaving ? fi.common.saving : fi.teams.actions.save}
            </Button>
            <ExportButton
              stageRef={stageRef}
              filename={(name.trim() || fi.layouts[layoutId]).replace(
                /\s+/g,
                "_"
              )}
              disabled={!selectedTemplate}
            />
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <TeamImageStage
            stageRef={stageRef}
            layout={layout}
            backgroundUrl={selectedTemplate?.backgroundUrl ?? null}
            athletes={orderedAthletes}
            textValues={deferredTextValues}
            displayWidth={Math.min(540, layout.canvas.w)}
          />
        </div>
      </div>
    </div>
  )
}
