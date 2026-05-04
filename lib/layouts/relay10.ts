import type { Layout } from "./types"

const W = 2160
const H = 2700

const PORTRAIT_W = 360
const PORTRAIT_H = 450
const COL_GAP = 30

const ROW_STARTS_Y = [440, 940, 1440] as const

const NAME_FONT_SIZE = 48
const NUMBER_FONT_SIZE = 75

const NAME_BOTTOM_OFFSET_Y = PORTRAIT_H - 16
const NAME_BOX_TOP_OFFSET_Y = 270
const NAME_BOX_HEIGHT = NAME_BOTTOM_OFFSET_Y - NAME_BOX_TOP_OFFSET_Y
const NAME_LINE_HEIGHT = 1.05
const NUMBER_OFFSET_Y =
  NAME_BOTTOM_OFFSET_Y -
  NAME_FONT_SIZE * NAME_LINE_HEIGHT -
  NUMBER_FONT_SIZE / 2

const NAME_INSET = 60

function rowStartX(count: number): number {
  const totalW = count * PORTRAIT_W + (count - 1) * COL_GAP
  return (W - totalW) / 2
}

function athleteSlot(rowIndex: 0 | 1 | 2, columnIndex: number) {
  const colCounts = [3, 4, 3] as const
  const startX = rowStartX(colCounts[rowIndex])
  const x = startX + columnIndex * (PORTRAIT_W + COL_GAP)
  const y = ROW_STARTS_Y[rowIndex]
  return {
    x,
    y,
    w: PORTRAIT_W,
    h: PORTRAIT_H,

    // Anchored to the left edge of the portrait so the two-digit "10."
    // doesn't reach into the centered name area below.
    numberX: x - 24,
    numberY: y + NUMBER_OFFSET_Y,
    numberFontSize: NUMBER_FONT_SIZE,

    nameX: x + NAME_INSET,
    nameY: y + NAME_BOX_TOP_OFFSET_Y,
    nameHeight: NAME_BOX_HEIGHT,
    nameFontSize: NAME_FONT_SIZE,
    nameMaxWidth: PORTRAIT_W - 2 * NAME_INSET,
  }
}

const relay10: Layout = {
  id: "relay10",
  displayName: "relay10",
  aspect: "portrait",
  canvas: { w: W, h: H },
  requiredAthleteCount: 10,
  athleteSlots: [
    athleteSlot(0, 0),
    athleteSlot(0, 1),
    athleteSlot(0, 2),
    athleteSlot(1, 0),
    athleteSlot(1, 1),
    athleteSlot(1, 2),
    athleteSlot(1, 3),
    athleteSlot(2, 0),
    athleteSlot(2, 1),
    athleteSlot(2, 2),
  ],
  textSlots: [
    {
      key: "eventName",
      label: "Tapahtuman nimi",
      x: 0,
      y: 100,
      maxWidth: W,
      align: "center",
      fontSize: 80,
      fontWeight: 600,
      fill: "#ffffff",
    },
    {
      key: "teamName",
      label: "Joukkueen nimi",
      x: 0,
      y: 220,
      maxWidth: W,
      align: "center",
      fontSize: 140,
      fontWeight: 700,
      fill: "#facc15",
    },
  ],
}

export default relay10
