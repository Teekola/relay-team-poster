"use client"

import type Konva from "konva"
import type { KonvaEventObject } from "konva/lib/Node"
import { useEffect, useMemo, useRef, useState } from "react"
import { Image as KonvaImage, Layer, Rect, Stage } from "react-konva"
import useImage from "use-image"
import {
  CROP_EDITOR_STAGE_W,
  CROP_EDITOR_STAGE_H,
  PORTRAIT_ASPECT_H,
  PORTRAIT_ASPECT_W,
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

type StageSize = { w: number; h: number }

/**
 * Internal "view" representation: where the image sits on the editor stage.
 * imgScale × natural dimensions = displayed dimensions.
 * The 4:5 crop frame is the entire stage.
 */
type View = { x: number; y: number; scale: number }

function viewFromCrop(crop: Crop, stageW: number, stageH: number): View {
  const scaleByWidth = stageW / crop.width
  const scaleByHeight = stageH / crop.height
  const scale = Math.max(scaleByWidth, scaleByHeight)
  return {
    x: -crop.x * scale,
    y: -crop.y * scale,
    scale,
  }
}

function cropFromView(view: View, stageW: number, stageH: number): Crop {
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
  stageW: number,
  stageH: number
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
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState<StageSize | null>(null)
  const [view, setView] = useState<View | null>(null)

  const naturalW = image?.naturalWidth ?? 0
  const naturalH = image?.naturalHeight ?? 0

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const update = () => {
      const w = el.clientWidth
      if (w <= 0) return
      const h = Math.round((w * PORTRAIT_ASPECT_H) / PORTRAIT_ASPECT_W)
      setStageSize((prev) =>
        prev && prev.w === w && prev.h === h ? prev : { w, h }
      )
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Read crop via ref so the view-derive effect doesn't re-run on every drag.
  const cropRef = useRef(crop)
  cropRef.current = crop
  useEffect(() => {
    if (!image || naturalW === 0 || naturalH === 0) return
    if (!stageSize) return
    const sourceCrop = cropRef.current ?? defaultCropForImage(naturalW, naturalH)
    const next = clampView(
      viewFromCrop(sourceCrop, stageSize.w, stageSize.h),
      naturalW,
      naturalH,
      stageSize.w,
      stageSize.h
    )
    setView(next)
  }, [image, naturalW, naturalH, stageSize])

  const dragBound = useMemo(() => {
    if (!image || !view || !stageSize) return undefined
    const displayedW = naturalW * view.scale
    const displayedH = naturalH * view.scale
    const minX = stageSize.w - displayedW
    const minY = stageSize.h - displayedH
    return (pos: { x: number; y: number }) => ({
      x: Math.min(0, Math.max(pos.x, minX)),
      y: Math.min(0, Math.max(pos.y, minY)),
    })
  }, [image, view, naturalW, naturalH, stageSize])

  function handleDragMove(event: KonvaEventObject<DragEvent>) {
    if (!view || !stageSize) return
    const node = event.target
    const next: View = { x: node.x(), y: node.y(), scale: view.scale }
    setView(next)
    onCropChange(
      clampCrop(
        cropFromView(next, stageSize.w, stageSize.h),
        naturalW,
        naturalH
      )
    )
  }

  function handleWheel(event: KonvaEventObject<WheelEvent>) {
    if (!image || !view || !stageSize) return
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
    const next = clampView(
      provisional,
      naturalW,
      naturalH,
      stageSize.w,
      stageSize.h
    )
    setView(next)
    onCropChange(
      clampCrop(
        cropFromView(next, stageSize.w, stageSize.h),
        naturalW,
        naturalH
      )
    )
  }

  const wrapperStyle = {
    aspectRatio: `${CROP_EDITOR_STAGE_W} / ${CROP_EDITOR_STAGE_H}`,
  } as const

  if (status === "failed") {
    return (
      <div
        ref={wrapperRef}
        style={wrapperStyle}
        className="flex w-full items-center justify-center rounded-lg border bg-muted text-sm shadow-sm"
      >
        Kuvan lataus epäonnistui.
      </div>
    )
  }

  if (!image || !view || !stageSize) {
    return (
      <div
        ref={wrapperRef}
        style={wrapperStyle}
        className="w-full rounded-lg border bg-muted shadow-sm"
      />
    )
  }

  return (
    <div
      ref={wrapperRef}
      style={wrapperStyle}
      className="w-full overflow-hidden rounded-lg border bg-muted shadow-sm"
    >
      <Stage
        ref={stageRef}
        width={stageSize.w}
        height={stageSize.h}
        onWheel={handleWheel}
        style={{ width: "100%", height: "100%" }}
        className="block touch-none"
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
            width={stageSize.w}
            height={stageSize.h}
            stroke="white"
            strokeWidth={0}
            listening={false}
          />
        </Layer>
      </Stage>
    </div>
  )
}
