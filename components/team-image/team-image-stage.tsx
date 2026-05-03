"use client"

import type Konva from "konva"
import dynamic from "next/dynamic"
import type { ComponentProps, RefObject } from "react"
import type { Doc } from "@/convex/_generated/dataModel"
import type { Layout } from "@/lib/layouts"
import { cn } from "@/lib/utils"

const InnerStage = dynamic(
  () => import("./team-image-stage.client").then((m) => m.TeamImageStage),
  {
    ssr: false,
    // The outer container below is rendered immediately — we just leave the
    // inside empty until the chunk arrives. Konva's `<Stage>` is heavy and
    // can't run on the server.
    loading: () => null,
  }
)

type AthleteWithUrl = Doc<"athletes"> & { imageUrl: string | null }

type Props = {
  layout: Layout
  backgroundUrl: string | null
  athletes: (AthleteWithUrl | null)[]
  textValues: Record<string, string>
  displayWidth: number
  stageRef?: RefObject<Konva.Stage | null>
  className?: string
}

export function TeamImageStage({ className, ...props }: Props) {
  const { layout, displayWidth } = props
  const scale = displayWidth / layout.canvas.w
  const displayHeight = layout.canvas.h * scale
  return (
    <div
      style={{ width: displayWidth, height: displayHeight }}
      className={cn(
        "overflow-hidden rounded-lg border bg-muted shadow-sm",
        className
      )}
    >
      <InnerStage {...props} />
    </div>
  )
}

/**
 * Empty placeholder of the same dimensions, used while the team image
 * record is still loading and we don't know which layout's aspect to
 * render. Same outer styling so there's no shift when the real stage
 * mounts.
 */
export function TeamImageStagePlaceholder({
  width,
  aspectRatio,
  className,
}: {
  width: number
  aspectRatio: number
  className?: string
}) {
  return (
    <div
      style={{ width, height: width / aspectRatio }}
      className={cn(
        "animate-pulse overflow-hidden rounded-lg border bg-muted shadow-sm",
        className
      )}
    />
  )
}

// Re-export the props type so consumers can `ComponentProps<typeof
// TeamImageStage>` — keeps the public interface stable.
export type TeamImageStageProps = ComponentProps<typeof TeamImageStage>
