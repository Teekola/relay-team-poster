"use client"

import { useAction, useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Plan } from "@/lib/ai/plan-schema"
import { useTeamDraftStore } from "@/lib/store/team-draft-store"
import { buildTeamDraftFromPlan } from "@/lib/team-image-form"
import { cn } from "@/lib/utils"
import { fi } from "@/messages/fi"

type Clarification = { field: string; question: string }

type Phase =
  | { kind: "idle" }
  | { kind: "loading"; label: string }
  | {
      kind: "clarifying"
      queue: Clarification[]
      index: number
      answers: Record<string, string>
    }
  | { kind: "plan" }

const PICK_NEW = "__new__" as const

export function AiChatPanel() {
  const router = useRouter()
  const planTeam = useAction(api.aiChat.planTeam)
  const createPlaceholder = useMutation(api.athletes.createPlaceholder)
  const setDraft = useTeamDraftStore((s) => s.setDraft)

  const roster = useQuery(api.athletes.list, {})
  const rosterById = useMemo(() => {
    const map = new Map<string, { name: string; nickname?: string }>()
    if (!roster) return map
    for (const athlete of roster) {
      map.set(athlete._id, { name: athlete.name, nickname: athlete.nickname })
    }
    return map
  }, [roster])

  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const [message, setMessage] = useState("")
  const [askedFields, setAskedFields] = useState<string[]>([])
  const [clarificationAnswers, setClarificationAnswers] = useState<
    Record<string, string>
  >({})
  const [plan, setPlan] = useState<Plan | null>(null)
  const [defaultTemplateId, setDefaultTemplateId] =
    useState<Id<"templates"> | null>(null)
  const [resolvedAmbiguous, setResolvedAmbiguous] = useState<
    Record<string, string>
  >({})
  const [clarificationAnswer, setClarificationAnswer] = useState("")
  const [correction, setCorrection] = useState("")
  const [isConfirming, setIsConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setPhase({ kind: "idle" })
    setMessage("")
    setAskedFields([])
    setClarificationAnswers({})
    setPlan(null)
    setDefaultTemplateId(null)
    setResolvedAmbiguous({})
    setClarificationAnswer("")
    setCorrection("")
    setIsConfirming(false)
    setError(null)
  }

  async function runPlan(opts: {
    label: string
    askedFields: string[]
    clarificationAnswers: Record<string, string>
    previousPlan?: Plan
    correction?: string
  }) {
    setError(null)
    setPhase({ kind: "loading", label: opts.label })
    try {
      const result = await planTeam({
        message,
        askedFields: opts.askedFields,
        clarificationAnswers: opts.clarificationAnswers,
        previousPlan: opts.previousPlan,
        correction: opts.correction,
      })
      setPlan(result.plan)
      setDefaultTemplateId(result.defaultTemplateId)
      setResolvedAmbiguous({})
      setCorrection("")
      setClarificationAnswer("")
      if (result.clarifications.length > 0) {
        setPhase({
          kind: "clarifying",
          queue: result.clarifications,
          index: 0,
          answers: {},
        })
      } else {
        setPhase({ kind: "plan" })
      }
    } catch (caught) {
      const reason = getDisplayError(caught)
      setError(reason || fi.teams.aiAssist.errors.generic)
      setPhase({ kind: "idle" })
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (phase.kind === "loading") return
    if (message.trim().length === 0) {
      setError(fi.teams.aiAssist.errors.empty)
      return
    }
    setAskedFields([])
    setClarificationAnswers({})
    await runPlan({
      label: fi.teams.aiAssist.thinking,
      askedFields: [],
      clarificationAnswers: {},
    })
  }

  async function advanceClarification(answer: string) {
    if (phase.kind !== "clarifying") return
    const { queue, index, answers } = phase
    const current = queue[index]
    const trimmed = answer.trim()
    const nextAnswers =
      trimmed.length === 0
        ? answers
        : { ...answers, [current.field]: trimmed }
    setClarificationAnswer("")

    // Still more questions to ask locally — advance without an AI call.
    if (index + 1 < queue.length) {
      setPhase({
        kind: "clarifying",
        queue,
        index: index + 1,
        answers: nextAnswers,
      })
      return
    }

    // Last question answered — merge answers into the cumulative
    // record and call the AI once.
    const mergedAnswers = { ...clarificationAnswers, ...nextAnswers }
    const nextAsked = Array.from(
      new Set([...askedFields, ...queue.map((q) => q.field)])
    )
    setClarificationAnswers(mergedAnswers)
    setAskedFields(nextAsked)
    await runPlan({
      label: fi.teams.aiAssist.thinking,
      askedFields: nextAsked,
      clarificationAnswers: mergedAnswers,
    })
  }

  function onSubmitClarification(event: React.FormEvent) {
    event.preventDefault()
    void advanceClarification(clarificationAnswer)
  }

  function onSkipClarification() {
    void advanceClarification("")
  }

  async function onSubmitCorrection(event: React.FormEvent) {
    event.preventDefault()
    if (!plan || correction.trim().length === 0) return
    await runPlan({
      label: fi.teams.aiAssist.correcting,
      askedFields,
      clarificationAnswers,
      previousPlan: plan,
      correction,
    })
  }

  async function onConfirmPlan() {
    if (!plan) return
    if (
      plan.ambiguousMatches.some((m) => !resolvedAmbiguous[m.inputName])
    ) {
      setError(fi.teams.aiAssist.errors.unresolvedAmbiguous)
      return
    }
    setError(null)
    setIsConfirming(true)
    try {
      const newAthleteEntries = await Promise.all([
        ...plan.newAthletes.map(
          async (a) =>
            [
              a.name,
              await createPlaceholder({
                name: a.name,
                nickname: a.nickname,
                gender: a.gender,
              }),
            ] as const
        ),
        ...plan.ambiguousMatches
          .filter((m) => resolvedAmbiguous[m.inputName] === PICK_NEW)
          .map(
            async (m) =>
              [
                m.inputName,
                await createPlaceholder({ name: m.inputName }),
              ] as const
          ),
      ])
      const newAthleteByInputName = new Map(newAthleteEntries)

      // Plan athleteIds are plain strings (Zod can't carry the Convex
      // `Id<"athletes">` brand) — cast once at the map boundary so
      // downstream code stays branded.
      const confidentByInputName = new Map<string, Id<"athletes">>(
        plan.confidentMatches.map((m) => [
          m.inputName,
          m.athleteId as Id<"athletes">,
        ])
      )
      const athleteOrder: (Id<"athletes"> | null)[] = plan.inputOrder.map(
        (inputName) => {
          const newId = newAthleteByInputName.get(inputName)
          if (newId) return newId
          const confidentId = confidentByInputName.get(inputName)
          if (confidentId) return confidentId
          const choice = resolvedAmbiguous[inputName]
          if (choice && choice !== PICK_NEW) {
            return choice as Id<"athletes">
          }
          return null
        }
      )

      setDraft(
        buildTeamDraftFromPlan({
          layoutId: plan.layoutId,
          templateId: defaultTemplateId,
          athleteOrder,
          textValues: plan.textValues,
        })
      )
      router.push("/teams/new?draft=ai")
      // Reset so a return navigation (back button or re-visit) lands on
      // a clean idle panel instead of restoring the just-confirmed plan.
      reset()
    } catch (caught) {
      const reason = getDisplayError(caught)
      setError(reason || fi.teams.aiAssist.errors.creationFailed)
      setIsConfirming(false)
    }
  }

  const allAmbiguousResolved =
    plan?.ambiguousMatches.every((m) =>
      Boolean(resolvedAmbiguous[m.inputName])
    ) ?? true

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 p-4 sm:p-5">
      <header className="flex flex-col gap-1">
        <h2 className="font-medium text-base">{fi.teams.aiAssist.title}</h2>
        <p className="text-muted-foreground text-sm">
          {fi.teams.aiAssist.description}
        </p>
      </header>

      {phase.kind === "idle" && (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={fi.teams.aiAssist.placeholder}
            className="min-h-24"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={message.trim().length === 0}>
              {fi.teams.aiAssist.submit}
            </Button>
          </div>
        </form>
      )}

      {phase.kind === "loading" && <LoadingRow label={phase.label} />}

      {phase.kind === "clarifying" && (
        <ClarificationPrompt
          question={phase.queue[phase.index].question}
          progress={`${phase.index + 1} / ${phase.queue.length}`}
          value={clarificationAnswer}
          onChange={setClarificationAnswer}
          onSubmit={onSubmitClarification}
          onSkip={onSkipClarification}
          onReset={reset}
        />
      )}

      {phase.kind === "plan" && plan && (
        <PlanCard
          plan={plan}
          rosterById={rosterById}
          resolvedAmbiguous={resolvedAmbiguous}
          onPickAmbiguous={(inputName, choice) =>
            setResolvedAmbiguous((prev) => ({ ...prev, [inputName]: choice }))
          }
          allAmbiguousResolved={allAmbiguousResolved}
          isConfirming={isConfirming}
          onConfirm={onConfirmPlan}
          onReset={reset}
          correction={correction}
          onCorrectionChange={setCorrection}
          onSubmitCorrection={onSubmitCorrection}
          error={error}
        />
      )}
    </section>
  )
}

function getDisplayError(caught: unknown): string {
  const message = caught instanceof Error ? caught.message : String(caught ?? "")
  return (
    message.match(/ConvexError:\s*([\s\S]*?)(?:\s+at handler|\s+Called by client|$)/)
      ?.[1]
      ?.trim() ?? message
  )
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm">
      <Spinner />
      <span>{label}</span>
    </div>
  )
}

function ClarificationPrompt({
  question,
  progress,
  value,
  onChange,
  onSubmit,
  onSkip,
  onReset,
}: {
  question: string
  progress: string
  value: string
  onChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
  onSkip: () => void
  onReset: () => void
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium text-sm">{question}</p>
        <span className="text-muted-foreground text-xs tabular-nums">
          {progress}
        </span>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={fi.teams.aiAssist.clarifyPlaceholder}
        autoFocus
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onReset}>
          {fi.teams.aiAssist.reset}
        </Button>
        <Button type="button" variant="outline" onClick={onSkip}>
          {fi.teams.aiAssist.skip}
        </Button>
        <Button type="submit" disabled={value.trim().length === 0}>
          {fi.teams.aiAssist.clarifySubmit}
        </Button>
      </div>
    </form>
  )
}

type PlanCardProps = {
  plan: Plan
  rosterById: Map<string, { name: string; nickname?: string }>
  resolvedAmbiguous: Record<string, string>
  onPickAmbiguous: (inputName: string, choice: string) => void
  allAmbiguousResolved: boolean
  isConfirming: boolean
  onConfirm: () => void
  onReset: () => void
  correction: string
  onCorrectionChange: (value: string) => void
  onSubmitCorrection: (event: React.FormEvent) => void
  error: string | null
}

function PlanCard({
  plan,
  rosterById,
  resolvedAmbiguous,
  onPickAmbiguous,
  allAmbiguousResolved,
  isConfirming,
  onConfirm,
  onReset,
  correction,
  onCorrectionChange,
  onSubmitCorrection,
  error,
}: PlanCardProps) {
  const layoutLabel = fi.layouts[plan.layoutId]
  const eventName = plan.textValues.eventName?.trim() ?? ""
  const teamName = plan.textValues.teamName?.trim() ?? ""

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4">
      <div className="flex flex-col gap-1 text-sm">
        <h3 className="font-medium">{fi.teams.aiAssist.planTitle}</h3>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
          <SummaryItem
            label={fi.teams.aiAssist.planLayout}
            value={layoutLabel}
          />
          {eventName && (
            <SummaryItem
              label={fi.teams.aiAssist.planEvent}
              value={eventName}
            />
          )}
          {teamName && (
            <SummaryItem
              label={fi.teams.aiAssist.planTeam}
              value={teamName}
            />
          )}
        </div>
      </div>

      {plan.confidentMatches.length > 0 && (
        <PlanSection title={fi.teams.aiAssist.planMatched}>
          <ul className="list-disc pl-5 text-sm">
            {plan.confidentMatches.map((match) => {
              const athlete = rosterById.get(match.athleteId)
              return (
                <li key={match.inputName}>
                  <span className="font-medium">{match.inputName}</span>
                  {athlete && (
                    <span className="text-muted-foreground">
                      {" → "}
                      {athlete.name}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </PlanSection>
      )}

      {plan.ambiguousMatches.length > 0 && (
        <PlanSection
          title={fi.teams.aiAssist.planAmbiguous}
          hint={fi.teams.aiAssist.planAmbiguousHint}
        >
          <ul className="flex flex-col gap-3 text-sm">
            {plan.ambiguousMatches.map((match) => {
              const choice = resolvedAmbiguous[match.inputName] ?? ""
              return (
                <li key={match.inputName} className="flex flex-col gap-1.5">
                  <div className="font-medium">{match.inputName}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {match.candidateAthleteIds.map((candidateId) => {
                      const athlete = rosterById.get(candidateId)
                      const label =
                        (athlete?.name ?? candidateId) +
                        (athlete?.nickname ? ` (${athlete.nickname})` : "")
                      return (
                        <PickerChip
                          key={candidateId}
                          label={label}
                          selected={choice === candidateId}
                          onClick={() =>
                            onPickAmbiguous(match.inputName, candidateId)
                          }
                        />
                      )
                    })}
                    <PickerChip
                      label={fi.teams.aiAssist.pickNew}
                      selected={choice === PICK_NEW}
                      dashed
                      onClick={() => onPickAmbiguous(match.inputName, PICK_NEW)}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </PlanSection>
      )}

      {(plan.newAthletes.length > 0 ||
        plan.ambiguousMatches.some(
          (m) => resolvedAmbiguous[m.inputName] === PICK_NEW
        )) && (
        <PlanSection
          title={fi.teams.aiAssist.planNew}
          hint={fi.teams.aiAssist.planNewHint}
        >
          <ul className="list-disc pl-5 text-sm">
            {plan.newAthletes.map((athlete) => (
              <li key={athlete.name}>
                {athlete.name}
                {athlete.nickname ? ` (${athlete.nickname})` : ""}
              </li>
            ))}
            {plan.ambiguousMatches
              .filter((m) => resolvedAmbiguous[m.inputName] === PICK_NEW)
              .map((m) => (
                <li key={`amb-new-${m.inputName}`}>{m.inputName}</li>
              ))}
          </ul>
        </PlanSection>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={onConfirm}
          disabled={!allAmbiguousResolved || isConfirming}
        >
          {isConfirming && <Spinner />}
          {fi.teams.aiAssist.ok}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onReset}
          disabled={isConfirming}
        >
          {fi.teams.aiAssist.reset}
        </Button>
      </div>

      <form onSubmit={onSubmitCorrection} className="flex flex-col gap-2">
        <Textarea
          value={correction}
          onChange={(e) => onCorrectionChange(e.target.value)}
          placeholder={fi.teams.aiAssist.correctionPlaceholder}
          className="min-h-12"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="outline"
            disabled={correction.trim().length === 0}
          >
            {fi.teams.aiAssist.correctionSubmit}
          </Button>
        </div>
      </form>
    </div>
  )
}

function PlanSection({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h4 className="font-medium text-sm">{title}</h4>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      {children}
    </section>
  )
}

function PickerChip({
  label,
  selected,
  dashed = false,
  onClick,
}: {
  label: string
  selected: boolean
  dashed?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-8 rounded-full border px-3 py-1 text-xs transition-colors",
        selected && "border-primary bg-primary text-primary-foreground",
        !selected && "border-border bg-background hover:bg-muted",
        !selected && dashed && "border-dashed"
      )}
    >
      {label}
    </button>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="font-medium">{label}:</span> {value}
    </span>
  )
}
