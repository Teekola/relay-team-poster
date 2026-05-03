"use client"

import { useMutation, useQuery } from "convex/react"
import { notFound, useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AthleteForm } from "@/components/athletes/athlete-form"
import { DeleteAthleteButton } from "@/components/athletes/delete-athlete-button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useHydrated } from "@/hooks/use-hydrated"
import { cn } from "@/lib/utils"
import { fi } from "@/messages/fi"

export default function EditAthletePage() {
  const params = useParams<{ id: string }>()
  const athleteId = params.id as Id<"athletes">
  const router = useRouter()
  const athlete = useQuery(api.athletes.get, { id: athleteId })

  const archive = useMutation(api.athletes.archive)
  const restore = useMutation(api.athletes.restore)
  const [pending, setPending] = useState(false)
  const [wasLoaded, setWasLoaded] = useState(false)

  useEffect(() => {
    if (athlete) setWasLoaded(true)
  }, [athlete])

  useEffect(() => {
    if (wasLoaded && athlete === null) {
      router.replace("/athletes")
    }
  }, [wasLoaded, athlete, router])

  const hydrated = useHydrated()
  const isLoading = !hydrated || athlete === undefined

  // Hard 404 only on cold load; later disappearance redirects via effect.
  if (athlete === null && !wasLoaded) {
    notFound()
  }

  async function handleArchive() {
    if (!athlete) return
    setPending(true)
    try {
      await archive({ id: athlete._id })
    } finally {
      setPending(false)
    }
  }

  async function handleRestore() {
    if (!athlete) return
    setPending(true)
    try {
      await restore({ id: athlete._id })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/athletes">
              {fi.athletes.title}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage
              className={cn(
                "wrap-anywhere",
                isLoading && "h-lh w-14 animate-pulse rounded-md bg-muted"
              )}
            >
              {athlete?.name ?? ""}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <header className="flex flex-wrap items-center justify-between gap-4">
        {isLoading ? (
          <Skeleton className="h-lh w-56 rounded-md text-2xl" />
        ) : (
          <h1 className="wrap-anywhere font-medium text-2xl">
            {athlete?.name}
          </h1>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {athlete?.active === false ? (
            <Button
              variant="outline"
              onClick={handleRestore}
              disabled={isLoading || pending}
            >
              {fi.athletes.actions.restore}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={handleArchive}
              disabled={isLoading || pending}
            >
              {fi.athletes.actions.archive}
            </Button>
          )}
          <DeleteAthleteButton
            athleteId={athleteId}
            athleteName={athlete?.name ?? ""}
            referenceCount={athlete?.referenceCount ?? 0}
            isLoading={isLoading}
          />
        </div>
      </header>
      <AthleteForm athlete={athlete ?? null} isLoading={isLoading} />
    </div>
  )
}
