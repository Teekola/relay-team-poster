import type { Layout } from "./types"

const W = 2160
const H = 2700

// Portrait dimensions match relay7 so the two layouts feel consistent.
const PORTRAIT_W = 460
const PORTRAIT_H = 575 // 4:5
const COL_GAP = 50
const ROW_GAP = 90
const COLS = 3
const ROWS = 2

const TOTAL_W = COLS * PORTRAIT_W + (COLS - 1) * COL_GAP
const FIRST_X = (W - TOTAL_W) / 2

const FIRST_ROW_Y = 560
const ROW_STARTS_Y = Array.from(
  { length: ROWS },
  (_, i) => FIRST_ROW_Y + i * (PORTRAIT_H + ROW_GAP)
)

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

function athleteSlot(legIndex: number) {
  const rowIndex = Math.floor(legIndex / COLS)
  const columnIndex = legIndex % COLS
  const x = FIRST_X + columnIndex * (PORTRAIT_W + COL_GAP)
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

const relay6: Layout = {
  id: "relay6",
  displayName: "relay6",
  aspect: "portrait",
  canvas: { w: W, h: H },
  requiredAthleteCount: 6,
  athleteSlots: Array.from({ length: 6 }, (_, i) => athleteSlot(i)),
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

export default relay6
