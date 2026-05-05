import { z } from "zod"
import type { Id } from "@/convex/_generated/dataModel"
import { LAYOUT_IDS, type LayoutId } from "@/lib/layouts"
import { fi } from "@/messages/fi"

export const DEFAULT_LAYOUT_ID: LayoutId = "relay3"
export const STAGE_DISPLAY_WIDTH = 540
export const STAGE_PLACEHOLDER_ASPECT = 1

export const teamImageFormSchema = z
  .object({
    name: z.string().trim().min(1, fi.common.requiredField),
    layoutId: z
      .enum(LAYOUT_IDS as readonly [LayoutId, ...LayoutId[]])
      .nullable(),
    templateId: z
      .custom<Id<"templates">>((v) => typeof v === "string" && v.length > 0)
      .nullable(),
    textValues: z.record(z.string(), z.string()),
    athleteOrder: z.array(
      z
        .custom<Id<"athletes">>((v) => typeof v === "string" && v.length > 0)
        .nullable()
    ),
  })
  .superRefine((data, ctx) => {
    if (data.layoutId === null) {
      ctx.addIssue({
        code: "custom",
        message: fi.common.requiredField,
        path: ["layoutId"],
      })
    }
    if (data.templateId === null) {
      ctx.addIssue({
        code: "custom",
        message: fi.teams.errors.templateRequired,
        path: ["templateId"],
      })
    }
  })

export type TeamImageFormValues = z.infer<typeof teamImageFormSchema>

export const PLACEHOLDER_TEXT_SLOTS = [
  { key: "_loading_event", label: "Tapahtuman nimi" },
  { key: "_loading_team", label: "Joukkueteksti" },
] as const

const TEXT_SLOT_PRIORITY: Record<string, number> = {
  eventName: 0,
  teamLabel: 1,
  teamName: 1,
}

export function compareTextSlots<T extends { key: string }>(
  a: T,
  b: T
): number {
  const aPriority = TEXT_SLOT_PRIORITY[a.key] ?? 99
  const bPriority = TEXT_SLOT_PRIORITY[b.key] ?? 99
  if (aPriority !== bPriority) return aPriority - bPriority
  return a.key.localeCompare(b.key)
}
