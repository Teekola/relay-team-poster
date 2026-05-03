"use client"

import { useQuery } from "convex/react"
import { notFound, useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { DeleteTemplateButton } from "@/components/templates/delete-template-button"
import { TemplateForm } from "@/components/templates/template-form"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useHydrated } from "@/hooks/use-hydrated"
import { cn } from "@/lib/utils"
import { fi } from "@/messages/fi"

export default function EditTemplatePage() {
  const params = useParams<{ id: string }>()
  const templateId = params.id as Id<"templates">
  const router = useRouter()
  const template = useQuery(api.templates.get, { id: templateId })

  const [wasLoaded, setWasLoaded] = useState(false)
  useEffect(() => {
    if (template) setWasLoaded(true)
  }, [template])
  useEffect(() => {
    if (wasLoaded && template === null) {
      router.replace("/templates")
    }
  }, [wasLoaded, template, router])

  const hydrated = useHydrated()
  const isLoading = !hydrated || template === undefined

  if (template === null && !wasLoaded) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/templates">
              {fi.templates.title}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem
            className={cn(
              "wrap-anywhere",
              isLoading && "h-lh w-14 rounded-md bg-muted"
            )}
          >
            <BreadcrumbPage>{template?.name ?? ""}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <header className="flex flex-wrap items-center justify-between gap-4">
        {isLoading ? (
          <Skeleton className="h-8 w-56 rounded-md" />
        ) : (
          <h1 className="font-medium text-2xl">{template?.name}</h1>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <DeleteTemplateButton
            templateId={templateId}
            templateName={template?.name ?? ""}
            isLoading={isLoading}
          />
        </div>
      </header>
      <TemplateForm template={template ?? null} isLoading={isLoading} />
    </div>
  )
}
