"use client"

import { useEffect, useState } from "react"

/**
 * Returns false during SSR and the first client paint, then flips to true
 * after the component has mounted. Use this to gate any behaviour that
 * must not differ between the server-rendered HTML and the first client
 * render — for example `disabled` props derived from a Convex `useQuery`,
 * which resolves asynchronously on the client and would otherwise cause
 * hydration mismatches.
 *
 * Pattern:
 *   const hydrated = useHydrated()
 *   const isLoading = !hydrated || data === undefined
 *   <Button disabled={isLoading}>...</Button>
 *
 * Server and first client render both see `hydrated=false`, so `isLoading`
 * is consistently `true` — matching HTML. After mount the effect fires,
 * the component re-renders, and `isLoading` reflects the actual query
 * state.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  return hydrated
}
