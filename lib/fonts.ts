import { Geist, Geist_Mono } from "next/font/google"

export const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

/**
 * The resolved font-family string emitted by next/font/google for Geist
 * (e.g. `"__Geist_a1b2c3", "__Geist_Fallback_a1b2c3"`). This is the value
 * Konva's `<Text fontFamily={...} />` needs — Konva renders to a 2D canvas
 * and cannot resolve `font-sans` or `var(--font-sans)`.
 */
export const KONVA_FONT_FAMILY = geist.style.fontFamily

/**
 * Resolves once Geist (and any other declared web fonts) have finished
 * loading in the browser. Call this before mounting a Konva Stage that
 * renders text, and again before exporting a stage to PNG — otherwise the
 * canvas may render with the system fallback for one frame.
 *
 * Server-side: resolves immediately (no font system).
 */
export function ensureFontsLoaded(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve()
  return document.fonts.ready.then(() => undefined)
}
