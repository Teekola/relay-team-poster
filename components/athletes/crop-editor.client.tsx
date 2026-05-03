"use client"

import type Konva from "konva"
import type { KonvaEventObject } from "konva/lib/Node"
import { useEffect, useMemo, useRef, useState } from "react"
import { Image as KonvaImage, Layer, Rect, Stage } from "react-konva"
import useImage from "use-image"
import {
  CROP_EDITOR_STAGE_H,
  CROP_EDITOR_STAGE_W,
  type Crop,
  clampCrop,
  defaultCropForImage,
} from "@/lib/crop"

type Props = {
  imageSrc: string
  crop: Crop | null
  onCropChange: (crop: Crop) => void
}

const ZOOM_STEP = 1.08
const MAX_SCALE = 8

/**
 * Internal "view" representation: where the image sits on the editor stage.
 * imgScale × natural dimensions = displayed dimensions.
 * The 4:5 crop frame is the entire stage.
 */
type View = { x: number; y: number; scale: number }

function viewFromCrop(
  crop: Crop,
  _naturalW: number,
  _naturalH: number,
  stageW = CROP_EDITOR_STAGE_W,
  stageH = CROP_EDITOR_STAGE_H
): View {
  const scaleByWidth = stageW / crop.width
  const scaleByHeight = stageH / crop.height
  const scale = Math.max(scaleByWidth, scaleByHeight)
  return {
    x: -crop.x * scale,
    y: -crop.y * scale,
    scale,
  }
}

function cropFromView(
  view: View,
  stageW = CROP_EDITOR_STAGE_W,
  stageH = CROP_EDITOR_STAGE_H
): Crop {
  return {
    x: -view.x / view.scale,
    y: -view.y / view.scale,
    width: stageW / view.scale,
    height: stageH / view.scale,
  }
}

function clampView(
  view: View,
  naturalW: number,
  naturalH: number,
  stageW = CROP_EDITOR_STAGE_W,
  stageH = CROP_EDITOR_STAGE_H
): View {
  const minScale = Math.max(stageW / naturalW, stageH / naturalH)
  const scale = Math.max(minScale, Math.min(view.scale, MAX_SCALE))
  const displayedW = naturalW * scale
  const displayedH = naturalH * scale
  const x = Math.min(0, Math.max(view.x, stageW - displayedW))
  const y = Math.min(0, Math.max(view.y, stageH - displayedH))
  return { x, y, scale }
}

export function CropEditor({ imageSrc, crop, onCropChange }: Props) {
  const [image, status] = useImage(imageSrc, "anonymous")
  const stageRef = useRef<Konva.Stage>(null)
  const [view, setView] = useState<View | null>(null)

  const naturalW = image?.naturalWidth ?? 0
  const naturalH = image?.naturalHeight ?? 0

  useEffect(() => {
    if (!image || naturalW === 0 || naturalH === 0) return
    if (view !== null) return
    const initialCrop = crop ?? defaultCropForImage(naturalW, naturalH)
    const next = clampView(
      viewFromCrop(initialCrop, naturalW, naturalH),
      naturalW,
      naturalH
    )
    setView(next)
  }, [image, naturalW, naturalH, crop, view])

  const dragBound = useMemo(() => {
    if (!image || !view) return undefined
    const displayedW = naturalW * view.scale
    const displayedH = naturalH * view.scale
    const minX = CROP_EDITOR_STAGE_W - displayedW
    const minY = CROP_EDITOR_STAGE_H - displayedH
    return (pos: { x: number; y: number }) => ({
      x: Math.min(0, Math.max(pos.x, minX)),
      y: Math.min(0, Math.max(pos.y, minY)),
    })
  }, [image, view, naturalW, naturalH])

  function handleDragMove(event: KonvaEventObject<DragEvent>) {
    if (!view) return
    const node = event.target
    const next: View = { x: node.x(), y: node.y(), scale: view.scale }
    setView(next)
    onCropChange(clampCrop(cropFromView(next), naturalW, naturalH))
  }

  function handleWheel(event: KonvaEventObject<WheelEvent>) {
    if (!image || !view) return
    event.evt.preventDefault()
    const stage = event.target.getStage()
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const oldScale = view.scale
    const direction = event.evt.deltaY > 0 ? -1 : 1
    const proposedScale =
      direction > 0 ? oldScale * ZOOM_STEP : oldScale / ZOOM_STEP

    const pointerInImage = {
      x: (pointer.x - view.x) / oldScale,
      y: (pointer.y - view.y) / oldScale,
    }

    const provisional: View = {
      scale: proposedScale,
      x: pointer.x - pointerInImage.x * proposedScale,
      y: pointer.y - pointerInImage.y * proposedScale,
    }
    const next = clampView(provisional, naturalW, naturalH)
    setView(next)
    onCropChange(clampCrop(cropFromView(next), naturalW, naturalH))
  }

  const wrapperStyle = {
    aspectRatio: `${CROP_EDITOR_STAGE_W} / ${CROP_EDITOR_STAGE_H}`,
    maxWidth: CROP_EDITOR_STAGE_W,
  } as const

  if (status === "failed") {
    return (
      <div
        style={wrapperStyle}
        className="flex w-full items-center justify-center rounded-lg border bg-muted text-sm shadow-sm"
      >
        Kuvan lataus epäonnistui.
      </div>
    )
  }

  if (!image || !view) {
    return (
      <div
        style={wrapperStyle}
        className="w-full rounded-lg border bg-muted shadow-sm"
      />
    )
  }

  return (
    <div
      style={wrapperStyle}
      className="w-full overflow-hidden rounded-lg border bg-muted shadow-sm"
    >
      <Stage
        ref={stageRef}
        width={CROP_EDITOR_STAGE_W}
        height={CROP_EDITOR_STAGE_H}
        onWheel={handleWheel}
        style={{ width: "100%", height: "100%" }}
        // `!important` is required: Konva sets `style="width: 400px"`
        // inline on the canvas, which would otherwise win over our CSS and
        // make the editor view ~0.5% larger than the SVG-based preview.
        className="block touch-none [&>canvas]:block [&>canvas]:h-full! [&>canvas]:w-full!"
      >
        <Layer>
          <KonvaImage
            image={image}
            x={view.x}
            y={view.y}
            width={naturalW * view.scale}
            height={naturalH * view.scale}
            draggable
            dragBoundFunc={dragBound}
            onDragMove={handleDragMove}
          />
          <Rect
            x={0}
            y={0}
            width={CROP_EDITOR_STAGE_W}
            height={CROP_EDITOR_STAGE_H}
            stroke="white"
            strokeWidth={0}
            listening={false}
          />
        </Layer>
      </Stage>
    </div>
  )
}
