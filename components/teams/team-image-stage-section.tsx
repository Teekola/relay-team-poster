"use client"

import type Konva from "konva"
import { type RefObject, useMemo } from "react"
import { type Control, useWatch } from "react-hook-form"
import {
  ResponsiveTeamImageStage,
  TeamImageStagePlaceholder,
} from "@/components/team-image/team-image-stage"
import type { Doc, Id } from "@/convex/_generated/dataModel"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useOrderedAthletes } from "@/hooks/use-ordered-athletes"
import { LAYOUTS } from "@/lib/layouts"
import {
  STAGE_DISPLAY_WIDTH,
  STAGE_PLACEHOLDER_ASPECT,
  type TeamImageFormValues,
} from "@/lib/team-image-form"

type Props = {
  control: Control<TeamImageFormValues>
  templates:
    | { _id: Id<"templates">; backgroundUrl: string | null }[]
    | undefined
  athletes: (Doc<"athletes"> & { imageUrl: string | null })[] | undefined
  stageRef: RefObject<Konva.Stage | null>
}

export function TeamImageStageSection({
  control,
  templates,
  athletes,
  stageRef,
}: Props) {
  const layoutId = useWatch({ control, name: "layoutId" })
  const templateId = useWatch({ control, name: "templateId" })
  const textValues = useWatch({ control, name: "textValues" })
  const athleteOrder = useWatch({ control, name: "athleteOrder" })

  const layout = layoutId ? LAYOUTS[layoutId] : null
  const selectedTemplate = useMemo(() => {
    if (!templateId || !templates) return null
    return templates.find((t) => t._id === templateId) ?? null
  }, [templateId, templates])
  const orderedAthletes = useOrderedAthletes(athleteOrder ?? [], athletes)
  const debouncedTextValues = useDebouncedValue(textValues ?? {}, 200)

  if (!layout) {
    return (
      <TeamImageStagePlaceholder
        width={STAGE_DISPLAY_WIDTH}
        aspectRatio={STAGE_PLACEHOLDER_ASPECT}
      />
    )
  }

  return (
    <ResponsiveTeamImageStage
      stageRef={stageRef}
      layout={layout}
      backgroundUrl={selectedTemplate?.backgroundUrl ?? null}
      athletes={orderedAthletes}
      textValues={debouncedTextValues}
      maxWidth={STAGE_DISPLAY_WIDTH}
    />
  )
}
