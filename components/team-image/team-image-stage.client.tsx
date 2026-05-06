"use client"

import type Konva from "konva"
import { memo, type RefObject } from "react"
import {
  Image as KonvaImage,
  Text as KonvaText,
  Layer,
  Rect,
  Stage,
} from "react-konva"
import useImage from "use-image"
import type { Doc } from "@/convex/_generated/dataModel"
import { KONVA_FONT_FAMILY } from "@/lib/fonts"
import type { AthleteSlot, Layout, TextSlot } from "@/lib/layouts"

type AthleteWithUrl = Doc<"athletes"> & { imageUrl: string | null }

type Props = {
  layout: Layout
  backgroundUrl: string | null
  /**
   * Positional: index N matches `layout.athleteSlots[N]`. Use `null` for an
   * unfilled slot so later athletes don't shift leftward.
   */
  athletes: (AthleteWithUrl | null)[]
  textValues: Record<string, string>
  displayWidth: number
  stageRef?: RefObject<Konva.Stage | null>
}

export const TeamImageStage = memo(TeamImageStageInner)

function TeamImageStageInner({
  layout,
  backgroundUrl,
  athletes,
  textValues,
  displayWidth,
  stageRef,
}: Props) {
  const { canvas } = layout
  const scale = displayWidth / canvas.w

  const pixelRatio = scale

  // Outer dimensions live in the wrapper component (team-image-stage.tsx) so
  // the page can render a same-size placeholder during the dynamic chunk
  // load — preventing layout shift when the Konva stage finally mounts.
  return (
    <div
      style={{
        width: canvas.w,
        height: canvas.h,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      <Stage
        ref={stageRef}
        width={canvas.w}
        height={canvas.h}
        pixelRatio={pixelRatio}
      >
        <Layer listening={false}>
          <BackgroundLayer
            url={backgroundUrl}
            width={canvas.w}
            height={canvas.h}
          />
          {layout.athleteSlots.map((slot, index) => {
            const athlete = athletes[index]
            if (!athlete) return null
            // Slot index is the positional key; keying on athlete._id is
            // incorrect since the same athlete could in principle be in any
            // slot.
            return (
              <AthleteOnStage
                // biome-ignore lint/suspicious/noArrayIndexKey: positional slot key
                key={`slot-${index}`}
                slot={slot}
                index={index}
                athlete={athlete}
              />
            )
          })}
          {layout.textSlots.map((slot) => {
            const value = textValues[slot.key] ?? slot.defaultValue ?? ""
            if (value.length === 0) return null
            return <TextOnStage key={slot.key} slot={slot} value={value} />
          })}
        </Layer>
      </Stage>
    </div>
  )
}

function BackgroundLayer({
  url,
  width,
  height,
}: {
  url: string | null
  width: number
  height: number
}) {
  const [image] = useImage(url ?? "", "anonymous")
  if (!url || !image) return null
  return <KonvaImage image={image} x={0} y={0} width={width} height={height} />
}

/**
 * Conservative width estimator for bold sans-serif text. Canvas-based
 * `measureText` would be more accurate, but `ctx.font` doesn't reliably
 * recognise the next/font hashed family at first paint, which produced a
 * narrower fallback width and caused us to force `\n` on names that should
 * have been single-string-wrapped. A simple per-character estimate that
 * slightly *over*-estimates is safer here — the worst case is forcing
 * Konva's natural word-wrap a touch sooner than necessary.
 */
function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.62
}

type NameRender = { text: string; fontSize: number }

/**
 * Render firstname / lastname on two separate lines, shrinking the font for
 * this single slot if needed so both parts each fit on one line. Floor at
 * 65 % of the layout's base font size — below that the slot looks broken and
 * the user should rename the athlete.
 */
function nameRender(
  fullName: string,
  maxWidth: number,
  baseFontSize: number
): NameRender {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return { text: fullName, fontSize: baseFontSize }
  const firstName = parts[0]
  const lastName = parts.slice(1).join(" ")
  const longest = Math.max(
    estimateTextWidth(firstName, baseFontSize),
    estimateTextWidth(lastName, baseFontSize)
  )
  let fontSize = baseFontSize
  if (longest > maxWidth) {
    const minFontSize = Math.round(baseFontSize * 0.65)
    fontSize = Math.max(
      Math.round((baseFontSize * maxWidth) / longest),
      minFontSize
    )
  }
  return { text: `${firstName}\n${lastName}`, fontSize }
}

function AthleteOnStage({
  slot,
  index,
  athlete,
}: {
  slot: AthleteSlot
  index: number
  athlete: AthleteWithUrl
}) {
  const [image] = useImage(athlete.imageUrl ?? "", "anonymous")
  const renderedName = nameRender(
    athlete.name,
    slot.nameMaxWidth,
    slot.nameFontSize
  )
  // Black gradient overlaying the bottom 55 % of the portrait — transparent at
  // the top fading to ~85 % black at the bottom — so overlaid white text reads
  // cleanly regardless of the photo's underlying brightness.
  const fadeStartY = slot.y + slot.h * 0.45
  const fadeHeight = slot.h * 0.55
  const textShadow = {
    shadowColor: "rgba(0,0,0,0.85)",
    shadowBlur: Math.round(slot.h * 0.04),
    shadowOffsetX: 0,
    shadowOffsetY: Math.round(slot.h * 0.01),
    shadowOpacity: 1,
  }
  return (
    <>
      {image && (
        <KonvaImage
          image={image}
          x={slot.x}
          y={slot.y}
          width={slot.w}
          height={slot.h}
          crop={athlete.crop}
        />
      )}
      <Rect
        x={slot.x}
        y={fadeStartY}
        width={slot.w}
        height={fadeHeight}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: fadeHeight }}
        fillLinearGradientColorStops={[
          0,
          "rgba(0,0,0,0)",
          1,
          "rgba(0,0,0,0.85)",
        ]}
      />
      <KonvaText
        text={`${index + 1}.`}
        x={slot.numberX}
        y={slot.numberY}
        fontFamily={KONVA_FONT_FAMILY}
        fontStyle="bold"
        fontSize={slot.numberFontSize}
        fill={slot.numberFill ?? "#ffffff"}
        {...textShadow}
      />
      <KonvaText
        text={renderedName.text}
        x={slot.nameX}
        y={slot.nameY}
        width={slot.nameMaxWidth}
        height={slot.nameHeight}
        verticalAlign="bottom"
        fontFamily={KONVA_FONT_FAMILY}
        fontStyle="bold"
        fontSize={renderedName.fontSize}
        fill={slot.nameFill ?? "#ffffff"}
        align="center"
        lineHeight={1.05}
        {...textShadow}
      />
    </>
  )
}

function TextOnStage({ slot, value }: { slot: TextSlot; value: string }) {
  const text = slot.transform === "uppercase" ? value.toUpperCase() : value
  const blur = Math.max(6, Math.round(slot.fontSize * 0.18))
  return (
    <KonvaText
      text={text}
      x={slot.x}
      y={slot.y}
      width={slot.maxWidth}
      height={slot.height}
      verticalAlign={slot.verticalAlign}
      align={slot.align}
      fontFamily={KONVA_FONT_FAMILY}
      fontSize={slot.fontSize}
      fontStyle={slot.fontWeight >= 600 ? "bold" : "normal"}
      fill={slot.fill ?? "#ffffff"}
      shadowColor="rgba(0,0,0,0.85)"
      shadowBlur={blur}
      shadowOffsetX={0}
      shadowOffsetY={Math.round(slot.fontSize * 0.04)}
      shadowOpacity={1}
    />
  )
}
