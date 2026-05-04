import type { Layout } from "./types"

const W = 2160
const H = 2700

// 25 athletes → 5 × 5 grid. Portraits are small; labels stay legible thanks
// to the gradient fade and text shadow applied by TeamImageStage.
const PORTRAIT_W = 360
const PORTRAIT_H = 450 // 4:5
const COL_GAP = 24
const ROW_GAP = 24
const COLS = 5
const ROWS = 5

const TOTAL_W = COLS * PORTRAIT_W + (COLS - 1) * COL_GAP
const FIRST_X = (W - TOTAL_W) / 2

const FIRST_ROW_Y = 360
const ROW_STARTS_Y = Array.from(
  { length: ROWS },
  (_, i) => FIRST_ROW_Y + i * (PORTRAIT_H + ROW_GAP)
)

const NAME_FONT_SIZE = 38
const NUMBER_FONT_SIZE = 60

const NAME_BOTTOM_OFFSET_Y = PORTRAIT_H - 14
const NAME_BOX_TOP_OFFSET_Y = 280
const NAME_BOX_HEIGHT = NAME_BOTTOM_OFFSET_Y - NAME_BOX_TOP_OFFSET_Y
const NAME_LINE_HEIGHT = 1.05
const NUMBER_OFFSET_Y =
  NAME_BOTTOM_OFFSET_Y -
  NAME_FONT_SIZE * NAME_LINE_HEIGHT -
  NUMBER_FONT_SIZE / 2

const NAME_INSET = 55

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

    // Anchored to the left edge of the portrait so two-digit numbers
    // ("10.", "25.") don't reach into the centered name area.
    numberX: x - 16,
    numberY: y + NUMBER_OFFSET_Y,
    numberFontSize: NUMBER_FONT_SIZE,

    nameX: x + NAME_INSET,
    nameY: y + NAME_BOX_TOP_OFFSET_Y,
    nameHeight: NAME_BOX_HEIGHT,
    nameFontSize: NAME_FONT_SIZE,
    nameMaxWidth: PORTRAIT_W - 2 * NAME_INSET,
  }
}

const relay25: Layout = {
  id: "relay25",
  displayName: "relay25",
  aspect: "portrait",
  canvas: { w: W, h: H },
  requiredAthleteCount: 25,
  athleteSlots: Array.from({ length: 25 }, (_, i) => athleteSlot(i)),
  textSlots: [
    {
      key: "eventName",
      label: "Tapahtuman nimi",
      x: 0,
      y: 90,
      maxWidth: W,
      align: "center",
      fontSize: 70,
      fontWeight: 600,
      fill: "#ffffff",
    },
    {
      key: "teamName",
      label: "Joukkueen nimi",
      x: 0,
      y: 195,
      maxWidth: W,
      align: "center",
      fontSize: 120,
      fontWeight: 700,
      fill: "#facc15",
    },
  ],
}

export default relay25
