import { google } from "@ai-sdk/google"
import { generateText, Output } from "ai"
import { ConvexError, v } from "convex/values"
import {
  type Plan,
  type RawPlan,
  planSchema,
  rawPlanSchema,
} from "../lib/ai/plan-schema"
import {
  buildPlannerUserPrompt,
  PLANNER_SYSTEM_PROMPT,
  type RosterEntry,
} from "../lib/ai/prompt"
import { LAYOUTS } from "../lib/layouts"
import { api } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import { action } from "./_generated/server"

const layoutIdValidator = v.union(
  v.literal("relay2"),
  v.literal("relay3"),
  v.literal("relay4"),
  v.literal("relay6"),
  v.literal("relay7"),
  v.literal("relay10"),
  v.literal("relay25")
)

const planArgValidator = v.object({
  confidentMatches: v.array(
    v.object({
      inputName: v.string(),
      athleteId: v.string(),
    })
  ),
  ambiguousMatches: v.array(
    v.object({
      inputName: v.string(),
      candidateAthleteIds: v.array(v.string()),
    })
  ),
  newAthletes: v.array(
    v.object({
      name: v.string(),
      nickname: v.optional(v.string()),
      gender: v.optional(v.union(v.literal("M"), v.literal("W"))),
    })
  ),
  layoutId: layoutIdValidator,
  textValues: v.record(v.string(), v.string()),
  inputOrder: v.array(v.string()),
})

type ClarificationField = "eventName" | "teamName"
export type Clarification = { field: ClarificationField; question: string }

const CLARIFICATION_QUESTIONS: Record<ClarificationField, string> = {
  eventName: "Mikä on tapahtuma? (esim. Jukola 2026 Eura)",
  teamName: "Mikä on joukkueen nimi? (esim. Angelniemen Ankkuri 1)",
}

const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite-preview"
const DEFAULT_GEMINI_FALLBACK_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
] as const

function pickClarifications(
  plan: Plan,
  asked: ReadonlySet<string>
): Clarification[] {
  const order: ClarificationField[] = ["eventName", "teamName"]
  const result: Clarification[] = []
  for (const field of order) {
    if (asked.has(field)) continue
    if (!plan.textValues[field]?.trim()) {
      result.push({ field, question: CLARIFICATION_QUESTIONS[field] })
    }
  }
  return result
}

export const planTeam = action({
  args: {
    message: v.string(),
    previousPlan: v.optional(planArgValidator),
    correction: v.optional(v.string()),
    askedFields: v.optional(v.array(v.string())),
    clarificationAnswers: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    plan: Plan
    defaultTemplateId: Id<"templates"> | null
    clarifications: Clarification[]
  }> => {
    const message = args.message.trim()
    if (message.length === 0) {
      throw new ConvexError("Viesti on tyhjä.")
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new ConvexError(
        "AI ei ole konfiguroitu (GOOGLE_GENERATIVE_AI_API_KEY puuttuu)."
      )
    }

    const roster: RosterEntry[] = await ctx.runQuery(
      api.athletes.listForClubMinimal,
      {}
    )

    let raw: RawPlan
    try {
      raw = await generatePlanWithFallbacks({
        message,
        roster,
        clarificationAnswers: args.clarificationAnswers,
        previousPlan: args.previousPlan,
        correction: args.correction,
      })
    } catch (caught) {
      const reason =
        caught instanceof Error ? caught.message : "Tuntematon virhe"
      throw new ConvexError(formatAiError(reason))
    }

    const rosterIds = new Set(roster.map((entry) => entry._id))
    const plan = withMessageTextFallback(
      normalisePlan(coercePlan(raw), rosterIds),
      message
    )

    const layout = LAYOUTS[plan.layoutId]
    const templates: Doc<"templates">[] = await ctx.runQuery(
      api.templates.list,
      { aspect: layout.aspect }
    )
    const defaultTemplateId = templates[0]?._id ?? null

    const askedFields = new Set(args.askedFields ?? [])
    const clarifications = pickClarifications(plan, askedFields)

    return { plan, defaultTemplateId, clarifications }
  },
})

async function generatePlanWithFallbacks(args: {
  message: string
  roster: RosterEntry[]
  clarificationAnswers?: Record<string, string>
  previousPlan?: Plan
  correction?: string
}): Promise<RawPlan> {
  const prompt = buildPlannerUserPrompt(args)
  const models = getGeminiModelIds()
  let lastError: unknown

  for (const [index, modelId] of models.entries()) {
    try {
      const result = await generateText({
        model: google(modelId),
        output: Output.object({ schema: rawPlanSchema }),
        system: PLANNER_SYSTEM_PROMPT,
        prompt,
      })
      return result.output
    } catch (caught) {
      lastError = caught
      const reason =
        caught instanceof Error ? caught.message : "Tuntematon virhe"
      const nextModel = models[index + 1]
      if (!nextModel || !isRetryableRateLimitError(reason)) break
      console.warn(
        `Gemini model ${modelId} was rate-limited; retrying with ${nextModel}.`
      )
    }
  }

  throw lastError ?? new Error("AI-pyyntö epäonnistui.")
}

function getGeminiModelIds(): string[] {
  const fallbackModels =
    process.env.GEMINI_FALLBACK_MODELS?.split(",")
      .map((model) => model.trim())
      .filter((model) => model.length > 0) ?? DEFAULT_GEMINI_FALLBACK_MODELS
  const configuredModels = [
    process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    ...fallbackModels,
  ]

  return Array.from(new Set(configuredModels))
}

function formatAiError(reason: string): string {
  if (isDailyQuotaError(reason)) {
    return "AI:n päivittäinen käyttöraja tuli vastaan. Yritä uudelleen, kun kiintiö nollautuu."
  }

  const retrySeconds = getRetrySeconds(reason)
  if (/quota exceeded/i.test(reason)) {
    return "AI:n käyttöraja tuli vastaan. Yritä myöhemmin uudelleen."
  }

  if (retrySeconds || isRetryableRateLimitError(reason)) {
    const roundedSeconds = retrySeconds ? Math.ceil(Number(retrySeconds)) : null
    return roundedSeconds
      ? `AI:n käyttöraja tuli vastaan. Yritä uudelleen ${roundedSeconds} sekunnin kuluttua.`
      : "AI:n käyttöraja tuli vastaan. Yritä hetken kuluttua uudelleen."
  }

  if (/No object generated|response did not match schema/i.test(reason)) {
    return "AI ei saanut muodostettua käyttökelpoista ehdotusta. Yritä muotoilla viesti hieman toisin."
  }

  return "AI-pyyntö epäonnistui. Yritä hetken kuluttua uudelleen."
}

function isRetryableRateLimitError(reason: string): boolean {
  return getRetrySeconds(reason) !== null || isRateLimitError(reason)
}

function isRateLimitError(reason: string): boolean {
  return /quota exceeded|rate limit|too many requests|resource_exhausted/i.test(
    reason
  )
}

function getRetrySeconds(reason: string): number | null {
  const value = reason.match(/retry in ([\d.]+)s/i)?.[1]
  return value ? Number(value) : null
}

function isDailyQuotaError(reason: string): boolean {
  return /requests per day|per day|per[_\s-]*day|rpd|daily|generaterequestsperday/i.test(
    reason
  )
}

function coercePlan(raw: RawPlan): Plan {
  const candidate = {
    confidentMatches: raw.confidentMatches
      .filter((match) => match.inputName && match.athleteId)
      .map((match) => ({
        inputName: match.inputName!,
        athleteId: match.athleteId!,
      })),
    ambiguousMatches: raw.ambiguousMatches
      .filter(
        (match) => match.inputName && match.candidateAthleteIds.length > 0
      )
      .map((match) => ({
        inputName: match.inputName!,
        candidateAthleteIds: match.candidateAthleteIds,
      })),
    newAthletes: raw.newAthletes
      .filter((athlete) => athlete.name && athlete.name.trim().length > 0)
      .map((athlete) => ({
        name: athlete.name!,
        ...(athlete.nickname ? { nickname: athlete.nickname } : {}),
        ...(athlete.gender === "M" || athlete.gender === "W"
          ? { gender: athlete.gender }
          : {}),
      })),
    layoutId: isPlanLayoutId(raw.layoutId) ? raw.layoutId : "relay3",
    textValues: Object.fromEntries(
      Object.entries(raw.textValues).map(([key, value]) => [
        key,
        value === null ? "" : String(value),
      ])
    ),
    inputOrder: raw.inputOrder,
  }

  return planSchema.parse(candidate)
}

function isPlanLayoutId(
  value: string | null | undefined
): value is Plan["layoutId"] {
  return (
    value === "relay2" ||
    value === "relay3" ||
    value === "relay4" ||
    value === "relay6" ||
    value === "relay7" ||
    value === "relay10" ||
    value === "relay25"
  )
}

function withMessageTextFallback(plan: Plan, message: string): Plan {
  const inferred = inferTextValues(message)
  return {
    ...plan,
    textValues: {
      ...plan.textValues,
      eventName:
        plan.textValues.eventName?.trim() ||
        inferred.eventName ||
        plan.textValues.eventName ||
        "",
      teamName:
        plan.textValues.teamName?.trim() ||
        inferred.teamName ||
        plan.textValues.teamName ||
        "",
    },
  }
}

function inferTextValues(message: string): {
  eventName?: string
  teamName?: string
} {
  const compact = message.replace(/\s+/g, " ")
  const eventName = compact.match(/\bSM[\s-]*viesti\b(?:\s+\d{4})?/iu)?.[0]
  const clubTeamName =
    compact.match(/\b(?:Angelniemen|Angelinemen)\s+Ankkuri\s+\d+\b/iu)?.[0] ??
    compact.match(/\bAngA\s+\d+\b/iu)?.[0]
  const numberedTeamName =
    compact.match(/\b\d+\.\s*joukkue\b/iu)?.[0] ??
    compact.match(/\b\d+\s+joukkue\b/iu)?.[0] ??
    compact.match(/\bjoukkue\s+\d+\b/iu)?.[0]

  return { eventName, teamName: clubTeamName ?? numberedTeamName }
}

// Drops roster IDs the model hallucinated — otherwise bad references
// would reach the form and crash the live preview.
function normalisePlan(raw: Plan, rosterIds: Set<string>): Plan {
  return {
    ...raw,
    confidentMatches: raw.confidentMatches.filter((match) =>
      rosterIds.has(match.athleteId)
    ),
    ambiguousMatches: raw.ambiguousMatches
      .map((match) => ({
        inputName: match.inputName,
        candidateAthleteIds: match.candidateAthleteIds.filter((id) =>
          rosterIds.has(id)
        ),
      }))
      .filter((match) => match.candidateAthleteIds.length > 0),
  }
}
