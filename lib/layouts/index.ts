import relay2 from "./relay2"
import relay3 from "./relay3"
import relay4 from "./relay4"
import relay6 from "./relay6"
import relay7 from "./relay7"
import relay10 from "./relay10"
import relay25 from "./relay25"
import type { Aspect, AthleteSlot, Layout, LayoutId, TextSlot } from "./types"

export const LAYOUTS: Record<LayoutId, Layout> = {
  relay2,
  relay3,
  relay4,
  relay6,
  relay7,
  relay10,
  relay25,
}

export const LAYOUT_IDS: readonly LayoutId[] = [
  "relay2",
  "relay3",
  "relay4",
  "relay6",
  "relay7",
  "relay10",
  "relay25",
]

export const ASPECT_DIMENSIONS: Record<Aspect, { w: number; h: number }> = {
  square: { w: 3000, h: 3000 },
  portrait: { w: 2160, h: 2700 },
}

export const ASPECTS: readonly Aspect[] = ["square", "portrait"]

const LAYOUT_ID_SET: ReadonlySet<string> = new Set<string>(LAYOUT_IDS)

export function isLayoutId(value: string): value is LayoutId {
  return LAYOUT_ID_SET.has(value)
}

export function layoutsByAspect(aspect: Aspect): Layout[] {
  return LAYOUT_IDS.map((id) => LAYOUTS[id]).filter(
    (layout) => layout.aspect === aspect
  )
}

export function withLayoutDefaults(
  layout: Layout,
  stored: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const slot of layout.textSlots) {
    if (slot.defaultValue) result[slot.key] = slot.defaultValue
  }
  return { ...result, ...stored }
}

export type { Aspect, AthleteSlot, Layout, LayoutId, TextSlot }
