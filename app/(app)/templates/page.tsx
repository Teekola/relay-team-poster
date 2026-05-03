"use client"

import { useQuery } from "convex/react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import type { Aspect } from "@/lib/layouts"
import { fi } from "@/messages/fi"

export default function TemplatesPage() {
  const templates = useQuery(api.templates.list, {})

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="font-medium text-2xl">{fi.templates.title}</h1>
        <Link href="/templates/new" className={buttonVariants()}>
          {fi.templates.addNew}
        </Link>
      </header>

      {templates === undefined && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {Array.from({ length: 2 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable placeholder key
            <li key={`skeleton-${index}`} className="flex">
              <TemplateCardSkeleton />
            </li>
          ))}
        </ul>
      )}

      {templates !== undefined && templates.length === 0 && (
        <p className="text-muted-foreground">{fi.templates.empty}</p>
      )}

      {templates !== undefined && templates.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {templates.map((template) => (
            <li key={template._id} className="flex">
              <TemplateCard
                templateId={template._id}
                name={template.name}
                aspect={template.aspect}
                backgroundUrl={template.backgroundUrl}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type TemplateCardProps = {
  templateId: Id<"templates">
  name: string
  aspect: Aspect
  backgroundUrl: string | null
}

function TemplateCardSkeleton() {
  // Mirrors TemplateCard: square image area + title + aspect description.
  return (
    <Card className="group relative w-full pt-0! transition-shadow" size="sm">
      <Skeleton className="aspect-square w-full rounded-none" />
      <CardHeader>
        <CardTitle className="text-sm">
          <Skeleton className="h-lh w-3/4 rounded-md" />
        </CardTitle>
        <CardDescription className="text-xs">
          <Skeleton className="h-lh w-1/2 rounded-md" />
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function TemplateCard({
  templateId,
  name,
  aspect,
  backgroundUrl,
}: TemplateCardProps) {
  return (
    <Card
      className="group relative w-full pt-0! transition-shadow hover:shadow-lg"
      size="sm"
    >
      <div className="flex aspect-square w-full items-center justify-center bg-muted">
        {backgroundUrl ? (
          <img
            src={backgroundUrl}
            alt={name}
            className="h-full w-full object-contain"
          />
        ) : null}
      </div>
      <CardHeader>
        <CardTitle className="text-sm">
          <Link
            href={`/templates/${templateId}`}
            className="rounded-xl outline-none before:absolute before:inset-0 before:rounded-[inherit] before:content-[''] hover:underline focus-visible:before:ring-3 focus-visible:before:ring-ring/30"
          >
            {name}
          </Link>
        </CardTitle>
        <CardDescription className="text-xs">
          {fi.templates.aspects[aspect]}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}
