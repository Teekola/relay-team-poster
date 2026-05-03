import type { Layout } from "./types"

const W = 3000
const H = 3000

// Image size bumped over the previous baseline; offsets that depend on
// portrait height (name/number positions, internal font sizes) scale with it.
const SIZE_SCALE = 1.155

const PORTRAIT_W = Math.round(700 * SIZE_SCALE)
const PORTRAIT_H = Math.round(875 * SIZE_SCALE)
const PORTRAIT_GAP = Math.round(80 * SIZE_SCALE)
// Portraits sit higher than vertical-center so the team label + event name
// stack below ends close to the sponsor strip baked into the background.
const PORTRAIT_Y = 800

const TOTAL_W = 3 * PORTRAIT_W + 2 * PORTRAIT_GAP
const FIRST_X = (W - TOTAL_W) / 2

const NAME_FONT_SIZE = Math.round(80 * SIZE_SCALE)
const NUMBER_FONT_SIZE = Math.round(130 * SIZE_SCALE)

// The name is bottom-anchored: its last line ends here (relative to portrait
// top). Multi-line names grow upward from this baseline.
const NAME_BOTTOM_OFFSET_Y = PORTRAIT_H - 30
// Top of the name's bounding box. Generous so 3+ lines still fit visually
// inside the portrait before reaching the gradient's transparent edge.
const NAME_BOX_TOP_OFFSET_Y = Math.round(560 * SIZE_SCALE)
const NAME_BOX_HEIGHT = NAME_BOTTOM_OFFSET_Y - NAME_BOX_TOP_OFFSET_Y

// Number is centered vertically with the full two-line name block (the
// default firstname / lastname split). Computed against the name's bottom
// (which is anchored) and the assumed line count of 2.
const NAME_LINE_HEIGHT = 1.05 // must match TeamImageStage's `<KonvaText lineHeight>`
const NUMBER_OFFSET_Y =
  NAME_BOTTOM_OFFSET_Y -
  NAME_FONT_SIZE * NAME_LINE_HEIGHT -
  NUMBER_FONT_SIZE / 2

const TEAM_LABEL_Y = PORTRAIT_Y + PORTRAIT_H + 80
// Event name is top-anchored so the gap between "1. joukkue" and the event
// name is the same whether the event name fits on one line or wraps to two.
// (A two-line wrap grows downward — keep the event-name font modest enough
// that the second line doesn't reach the sponsor strip.)
const EVENT_NAME_Y = TEAM_LABEL_Y + 160

// Visual space reserved on the left of each portrait for the leg number.
// Symmetric on the right keeps the (centered) name visually centered relative
// to the portrait midline, while wrapping kicks in before the name reaches
// the number on the left.
const NAME_INSET = 130

function athleteSlot(index: number) {
  const x = FIRST_X + index * (PORTRAIT_W + PORTRAIT_GAP)
  return {
    x,
    y: PORTRAIT_Y,
    w: PORTRAIT_W,
    h: PORTRAIT_H,

    numberX: x + Math.round(15 * SIZE_SCALE),
    numberY: PORTRAIT_Y + NUMBER_OFFSET_Y,
    numberFontSize: NUMBER_FONT_SIZE,

    nameX: x + NAME_INSET,
    nameY: PORTRAIT_Y + NAME_BOX_TOP_OFFSET_Y,
    nameHeight: NAME_BOX_HEIGHT,
    nameFontSize: NAME_FONT_SIZE,
    nameMaxWidth: PORTRAIT_W - 2 * NAME_INSET,
  }
}

const relay3: Layout = {
  id: "relay3",
  displayName: "relay3",
  aspect: "square",
  canvas: { w: W, h: H },
  requiredAthleteCount: 3,
  athleteSlots: [athleteSlot(0), athleteSlot(1), athleteSlot(2)],
  textSlots: [
    {
      key: "teamLabel",
      label: "Joukkueteksti",
      defaultValue: "1. joukkue",
      x: 0,
      y: TEAM_LABEL_Y,
      maxWidth: W,
      align: "center",
      fontSize: 130,
      fontWeight: 700,
      fill: "#ffffff",
    },
    {
      key: "eventName",
      label: "Tapahtuman nimi",
      x: 0,
      y: EVENT_NAME_Y,
      maxWidth: W,
      align: "center",
      fontSize: 190,
      fontWeight: 700,
      fill: "#facc15",
    },
  ],
}

export default relay3
