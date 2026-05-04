"use client"

import { useDeferredValue, useMemo } from "react"
import type { Id } from "@/convex/_generated/dataModel"

export function useOrderedAthletes<T extends { _id: Id<"athletes"> }>(
  athleteOrder: (Id<"athletes"> | null)[],
  athletes: T[] | undefined
): (T | null)[] {
  const deferred = useDeferredValue(athleteOrder)
  return useMemo(() => {
    if (!athletes) return []
    return deferred.map((id) => {
      if (!id) return null
      return athletes.find((a) => a._id === id) ?? null
    })
  }, [deferred, athletes])
}
