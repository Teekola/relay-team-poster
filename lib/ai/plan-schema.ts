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

export const rawPlanSchema = z.object({
  confidentMatches: z
    .array(
      z.object({
        inputName: z.string().nullable().optional(),
        athleteId: z.string().nullable().optional(),
      })
    )
    .default([]),
  ambiguousMatches: z
    .array(
      z.object({
        inputName: z.string().nullable().optional(),
        candidateAthleteIds: z.array(z.string()).default([]),
      })
    )
    .default([]),
  newAthletes: z
    .array(
      z.object({
        name: z.string().nullable().optional(),
        nickname: z.string().nullable().optional(),
        gender: z.string().nullable().optional(),
      })
    )
    .default([]),
  layoutId: z.string().nullable().optional(),
  textValues: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .default({}),
  inputOrder: z.array(z.string()).default([]),
})

export type Plan = z.infer<typeof planSchema>
export type RawPlan = z.infer<typeof rawPlanSchema>

export type ConfidentMatch = Plan["confidentMatches"][number]
export type AmbiguousMatch = Plan["ambiguousMatches"][number]
export type NewAthletePlan = Plan["newAthletes"][number]
