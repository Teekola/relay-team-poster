import { z } from "zod"
import { LAYOUT_IDS, type LayoutId } from "../layouts"

export const planSchema = z.object({
  confidentMatches: z.array(
    z.object({
      inputName: z.string(),
      athleteId: z.string(),
    })
  ),
  // AI must prefer this bucket over `newAthletes` when in doubt — the
  // chat panel surfaces candidates as a picker so the user resolves
  // typos rather than silently creating duplicates.
  ambiguousMatches: z.array(
    z.object({
      inputName: z.string(),
      candidateAthleteIds: z.array(z.string()).min(1).max(5),
    })
  ),
  newAthletes: z.array(
    z.object({
      name: z.string(),
      nickname: z.string().optional(),
      gender: z.enum(["M", "W"]).optional(),
    })
  ),
  layoutId: z.enum(LAYOUT_IDS as readonly [LayoutId, ...LayoutId[]]),
  textValues: z.record(z.string(), z.string()),
  // Each entry equals an inputName from one of the three buckets above;
  // client maps this back to athlete IDs in paste order.
  inputOrder: z.array(z.string()),
})

// Groq's strict JSON Schema mode (structuredOutputs: true) requires every
// property to appear in `required` and disallows `additionalProperties`,
// so we cannot use `.optional()` or `z.record(...)`. Optional-in-spirit
// fields are modelled with `.nullable()` instead, and dynamic-key
// dictionaries become explicit objects.
export const rawPlanSchema = z.object({
  confidentMatches: z
    .array(
      z.object({
        inputName: z.string().min(1),
        athleteId: z.string().min(1),
      })
    )
    .describe(
      "Every athlete-name token from the paste that matches exactly one roster entry. inputName is the token from the paste; athleteId is the matching roster id. Never null fields."
    ),
  ambiguousMatches: z
    .array(
      z.object({
        inputName: z.string().min(1),
        candidateAthleteIds: z.array(z.string()),
      })
    )
    .describe(
      "Tokens that could match more than one roster entry. Prefer this over creating new athletes whenever any roster entry is a plausible match."
    ),
  newAthletes: z
    .array(
      z.object({
        name: z.string().min(1),
        nickname: z.string().nullable(),
        gender: z.string().nullable(),
      })
    )
    .describe(
      "Tokens with no plausible roster match. Use only when no roster entry could plausibly be the runner."
    ),
  layoutId: z.string().nullable(),
  textValues: z.object({
    eventName: z.string().nullable(),
    teamName: z.string().nullable(),
  }),
  inputOrder: z
    .array(z.string())
    .describe(
      "Every athlete-name token from the paste, in running order. Never empty when the paste lists runners."
    ),
})

export type Plan = z.infer<typeof planSchema>
export type RawPlan = z.infer<typeof rawPlanSchema>

export type ConfidentMatch = Plan["confidentMatches"][number]
export type AmbiguousMatch = Plan["ambiguousMatches"][number]
export type NewAthletePlan = Plan["newAthletes"][number]
