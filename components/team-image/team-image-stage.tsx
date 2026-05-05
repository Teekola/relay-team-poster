"use client"

import type Konva from "konva"
import dynamic from "next/dynamic"
import {
  type ComponentProps,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"
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

type ResponsiveProps = Omit<Props, "displayWidth"> & {
  /** Hard cap on display width; the stage will be no wider than this. */
  maxWidth: number
}

/**
 * Auto-sizing wrapper around `TeamImageStage`: measures its own container
 * and clamps `displayWidth` to `min(maxWidth, layout.canvas.w, container)`.
 * Owns the resize state locally so width changes don't re-render the form
 * column. Width is integer-snapped so sub-pixel jitter dedupes via the
 * `setState` equality check.
 */
export function ResponsiveTeamImageStage({
  maxWidth,
  className,
  ...stageProps
}: ResponsiveProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(maxWidth)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const w = Math.floor(el.clientWidth)
      if (w > 0) setContainerWidth((prev) => (prev === w ? prev : w))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const displayWidth = Math.min(
    maxWidth,
    stageProps.layout.canvas.w,
    containerWidth
  )

  return (
    <div ref={containerRef} className="w-full min-w-0">
      <div className="lg:ml-auto lg:w-fit">
        <TeamImageStage
          {...stageProps}
          className={className}
          displayWidth={displayWidth}
        />
      </div>
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
  // Wrappers mirror `ResponsiveTeamImageStage` so the column doesn't shift
  // when the real stage replaces the placeholder.
  return (
    <div className="w-full min-w-0">
      <div className="lg:ml-auto lg:w-fit">
        <div
          style={{ width, height: width / aspectRatio }}
          className={cn(
            "animate-pulse overflow-hidden rounded-lg border bg-muted shadow-sm",
            className
          )}
        />
      </div>
    </div>
  )
}

// Re-export the props type so consumers can `ComponentProps<typeof
// TeamImageStage>` — keeps the public interface stable.
export type TeamImageStageProps = ComponentProps<typeof TeamImageStage>
