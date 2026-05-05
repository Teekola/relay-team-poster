"use client"

import { useEffect, useState } from "react"

/**
 * Returns `value` clamped to update at most once every `delayMs` of inactivity.
 * Use to feed expensive consumers (e.g. the Konva preview) from rapidly
 * changing form state so they don't reconcile on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    if (Object.is(debounced, value)) return
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs, debounced])
  return debounced
}
