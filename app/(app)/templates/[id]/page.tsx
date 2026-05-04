"use client"

import { useQuery } from "convex/react"
import { notFound, useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { DeleteTemplateButton } from "@/components/templates/delete-template-button"
import { TemplateForm } from "@/components/templates/template-form"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useHydrated } from "@/hooks/use-hydrated"
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
      <PageHeader
        parent={{ href: "/templates", label: fi.templates.title }}
        current={template?.name ?? ""}
        isLoading={isLoading}
        actions={
          <DeleteTemplateButton
            templateId={templateId}
            templateName={template?.name ?? ""}
            isLoading={isLoading}
          />
        }
      />
      <TemplateForm template={template ?? null} isLoading={isLoading} />
    </div>
  )
}
