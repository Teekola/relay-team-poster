import type { Layout } from "./types"

const W = 3000
const H = 3000

// 4 portraits in a row → smaller per-portrait scale than relay2/3.
const SIZE_SCALE = 0.88

const PORTRAIT_W = Math.round(700 * SIZE_SCALE)
const PORTRAIT_H = Math.round(875 * SIZE_SCALE)
const PORTRAIT_GAP = Math.round(80 * SIZE_SCALE)
const PORTRAIT_Y = 1000

const TOTAL_W = 4 * PORTRAIT_W + 3 * PORTRAIT_GAP
const FIRST_X = (W - TOTAL_W) / 2

const NAME_FONT_SIZE = Math.round(80 * SIZE_SCALE)
const NUMBER_FONT_SIZE = Math.round(130 * SIZE_SCALE)

const NAME_BOTTOM_OFFSET_Y = PORTRAIT_H - 25
const NAME_BOX_TOP_OFFSET_Y = Math.round(560 * SIZE_SCALE)
const NAME_BOX_HEIGHT = NAME_BOTTOM_OFFSET_Y - NAME_BOX_TOP_OFFSET_Y
const NAME_LINE_HEIGHT = 1.05
const NUMBER_OFFSET_Y =
  NAME_BOTTOM_OFFSET_Y -
  NAME_FONT_SIZE * NAME_LINE_HEIGHT -
  NUMBER_FONT_SIZE / 2

const TEAM_LABEL_Y = PORTRAIT_Y + PORTRAIT_H + 80
const EVENT_NAME_Y = TEAM_LABEL_Y + 160

const NAME_INSET = 110

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

const relay4: Layout = {
  id: "relay4",
  displayName: "relay4",
  aspect: "square",
  canvas: { w: W, h: H },
  requiredAthleteCount: 4,
  athleteSlots: [
    athleteSlot(0),
    athleteSlot(1),
    athleteSlot(2),
    athleteSlot(3),
  ],
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

export default relay4
