import type { ReactNode } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type Props = {
  parent: { href: string; label: string }
  current: string
  isLoading?: boolean
  titleSuffix?: ReactNode
  actions?: ReactNode
}

export function PageHeader({
  parent,
  current,
  isLoading,
  titleSuffix,
  actions,
}: Props) {
  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={parent.href}>{parent.label}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage
              className={cn(
                "wrap-anywhere",
                isLoading && "h-lh w-14 animate-pulse rounded-md bg-muted"
              )}
            >
              {!isLoading && current}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Skeleton className="h-8 w-56 rounded-md" />
          ) : (
            <>
              <h1 className="wrap-anywhere font-medium text-2xl">{current}</h1>
              {titleSuffix}
            </>
          )}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </header>
    </>
  )
}
