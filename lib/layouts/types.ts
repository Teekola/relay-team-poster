export type AthleteSlot = {
  // Portrait rectangle (in canvas pixel coords).
  x: number
  y: number
  w: number
  h: number

  // Leg number ("1.", "2." …) overlaid on the portrait.
  numberX: number
  numberY: number
  numberFontSize: number
  numberFill?: string

  // Athlete name overlaid on the portrait. The name is rendered inside a
  // bounding box (`nameY` × `nameHeight`) with `verticalAlign: "bottom"` so
  // the last line stays anchored and longer names grow upward.
  nameX: number
  nameY: number
  nameHeight: number
  nameFontSize: number
  nameMaxWidth: number
  nameFill?: string
}

export type TextSlot = {
  key: string
  label: string
  defaultValue?: string
  x: number
  y: number
  fontSize: number
  fontWeight: number
  transform?: "uppercase"
  align: "left" | "center" | "right"
  maxWidth?: number
  fill?: string
  /**
   * If set together with `height`, the text is rendered inside a box of the
   * given height. Combined with `verticalAlign: "bottom"`, the last line of
   * the (possibly wrapped) text sits at the box's bottom edge — useful for
   * keeping wrapped text from spilling into a sponsor strip below.
   */
  height?: number
  verticalAlign?: "top" | "middle" | "bottom"
}

export type LayoutId =
  | "relay2"
  | "relay3"
  | "relay4"
  | "relay7"
  | "relay10"
  | "relay25"

export type Aspect = "square" | "portrait"

export type Layout = {
  id: LayoutId
  displayName: string
  aspect: Aspect
  canvas: { w: number; h: number }
  requiredAthleteCount: number
  athleteSlots: AthleteSlot[]
  textSlots: TextSlot[]
}
