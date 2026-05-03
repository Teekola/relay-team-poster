import type { Layout } from "./types"

const W = 2160
const H = 2700

const PORTRAIT_W = 460
const PORTRAIT_H = 575 // 4:5
const COL_GAP = 50
const ROW_GAP = 90

// Top row of 3, bottom row of 4 (Jukola-style 3+4 grid).
const ROW_STARTS_Y = [560, 560 + PORTRAIT_H + ROW_GAP] as const
const ROW_COL_COUNTS = [3, 4] as const

const NAME_FONT_SIZE = 56
const NUMBER_FONT_SIZE = 90

const NAME_BOTTOM_OFFSET_Y = PORTRAIT_H - 20
const NAME_BOX_TOP_OFFSET_Y = 350
const NAME_BOX_HEIGHT = NAME_BOTTOM_OFFSET_Y - NAME_BOX_TOP_OFFSET_Y
const NAME_LINE_HEIGHT = 1.05
const NUMBER_OFFSET_Y =
  NAME_BOTTOM_OFFSET_Y -
  NAME_FONT_SIZE * NAME_LINE_HEIGHT -
  NUMBER_FONT_SIZE / 2

const NAME_INSET = 75

function rowStartX(count: number): number {
  const totalW = count * PORTRAIT_W + (count - 1) * COL_GAP
  return (W - totalW) / 2
}

function athleteSlot(rowIndex: 0 | 1, columnIndex: number) {
  const startX = rowStartX(ROW_COL_COUNTS[rowIndex])
  const x = startX + columnIndex * (PORTRAIT_W + COL_GAP)
  const y = ROW_STARTS_Y[rowIndex]
  return {
    x,
    y,
    w: PORTRAIT_W,
    h: PORTRAIT_H,

    numberX: x + 12,
    numberY: y + NUMBER_OFFSET_Y,
    numberFontSize: NUMBER_FONT_SIZE,

    nameX: x + NAME_INSET,
    nameY: y + NAME_BOX_TOP_OFFSET_Y,
    nameHeight: NAME_BOX_HEIGHT,
    nameFontSize: NAME_FONT_SIZE,
    nameMaxWidth: PORTRAIT_W - 2 * NAME_INSET,
  }
}

const relay7: Layout = {
  id: "relay7",
  displayName: "relay7",
  aspect: "portrait",
  canvas: { w: W, h: H },
  requiredAthleteCount: 7,
  athleteSlots: [
    athleteSlot(0, 0),
    athleteSlot(0, 1),
    athleteSlot(0, 2),
    athleteSlot(1, 0),
    athleteSlot(1, 1),
    athleteSlot(1, 2),
    athleteSlot(1, 3),
  ],
  textSlots: [
    {
      key: "eventName",
      label: "Tapahtuman nimi",
      x: 0,
      y: 110,
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
      y: 240,
      maxWidth: W,
      align: "center",
      fontSize: 150,
      fontWeight: 700,
      fill: "#facc15",
    },
  ],
}

export default relay7
