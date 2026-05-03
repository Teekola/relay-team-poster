export type Crop = {
  x: number
  y: number
  width: number
  height: number
}

export const PORTRAIT_ASPECT_W = 4
export const PORTRAIT_ASPECT_H = 5

export const CROP_EDITOR_STAGE_W = 400
export const CROP_EDITOR_STAGE_H = 500

/**
 * Default crop = the largest 4:5 rectangle centered in the source image.
 */
export function defaultCropForImage(naturalW: number, naturalH: number): Crop {
  const targetRatio = PORTRAIT_ASPECT_W / PORTRAIT_ASPECT_H
  const sourceRatio = naturalW / naturalH

  if (sourceRatio > targetRatio) {
    const cropWidth = naturalH * targetRatio
    return {
      x: (naturalW - cropWidth) / 2,
      y: 0,
      width: cropWidth,
      height: naturalH,
    }
  }

  const cropHeight = naturalW / targetRatio
  return {
    x: 0,
    y: (naturalH - cropHeight) / 2,
    width: naturalW,
    height: cropHeight,
  }
}

export function clampCrop(
  crop: Crop,
  naturalW: number,
  naturalH: number
): Crop {
  const targetRatio = PORTRAIT_ASPECT_W / PORTRAIT_ASPECT_H
  const minWidth = 50
  const maxWidthByH = naturalH * targetRatio
  const maxWidth = Math.min(naturalW, maxWidthByH)
  const width = Math.max(minWidth, Math.min(crop.width, maxWidth))
  const height = width / targetRatio
  const x = Math.max(0, Math.min(crop.x, naturalW - width))
  const y = Math.max(0, Math.min(crop.y, naturalH - height))
  return { x, y, width, height }
}
