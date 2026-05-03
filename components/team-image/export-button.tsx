"use client"

import type Konva from "konva"
import { type RefObject, useState } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { useHydrated } from "@/hooks/use-hydrated"
import { ensureFontsLoaded } from "@/lib/fonts"
import { fi } from "@/messages/fi"

type Props = {
  stageRef: RefObject<Konva.Stage | null>
  filename: string
  disabled?: boolean
}

export function ExportButton({ stageRef, filename, disabled }: Props) {
  const [isExporting, setIsExporting] = useState(false)
  // Hydration gate: the actual `disabled` prop depends on the parent's
  // selected template, which is derived from a Convex `useQuery`. That
  // query resolves asynchronously on the client, so SSR sees one value and
  // the first client render sees another — yielding hydration mismatches
  // on the disabled attribute. Forcing `disabled={true}` until after mount
  // guarantees server and first client render agree.
  const hydrated = useHydrated()
  const isDisabled = !hydrated || disabled || isExporting

  async function handleExport() {
    if (!stageRef.current) return
    setIsExporting(true)
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    try {
      await ensureFontsLoaded()
      const dataUrl = stageRef.current.toDataURL({
        pixelRatio: 1,
        mimeType: "image/png",
      })
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = `${filename}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button onClick={handleExport} disabled={isDisabled}>
      {isExporting && <Spinner />}
      {isExporting ? fi.common.saving : fi.teams.actions.export}
    </Button>
  )
}
