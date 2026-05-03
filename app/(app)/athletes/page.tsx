"use client"

import { useQuery } from "convex/react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { fi } from "@/messages/fi"

type GenderFilter = "all" | "M" | "W"

const GENDER_OPTIONS: { value: GenderFilter; label: string }[] = [
  { value: "all", label: fi.athletes.genderFilter.all },
  { value: "M", label: fi.athletes.genderFilter.male },
  { value: "W", label: fi.athletes.genderFilter.female },
]

export default function AthletesPage() {
  const [showArchived, setShowArchived] = useState(false)
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all")
  const [search, setSearch] = useState("")

  const athletes = useQuery(api.athletes.list, {
    includeArchived: showArchived,
    gender: genderFilter === "all" ? undefined : genderFilter,
  })

  const trimmedSearch = search.trim().toLowerCase()
  const filteredAthletes = useMemo(() => {
    if (!athletes) return athletes
    if (trimmedSearch.length === 0) return athletes
    return athletes.filter((athlete) =>
      athlete.name.toLowerCase().includes(trimmedSearch)
    )
  }, [athletes, trimmedSearch])

  const isFiltered = trimmedSearch.length > 0 || genderFilter !== "all"

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="font-medium text-2xl">{fi.athletes.title}</h1>
        <Link href="/athletes/new" className={buttonVariants()}>
          {fi.athletes.addNew}
        </Link>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={fi.athletes.searchPlaceholder}
          className="sm:max-w-xs"
        />
        <Select
          value={genderFilter}
          onValueChange={(value) => {
            if (value === "all" || value === "M" || value === "W") {
              setGenderFilter(value)
            }
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue>
              {(value) =>
                GENDER_OPTIONS.find((option) => option.value === value)
                  ?.label ?? null
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {GENDER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label className="flex w-fit cursor-pointer items-center gap-2 font-normal text-muted-foreground text-sm">
          <Checkbox
            checked={showArchived}
            onCheckedChange={(checked) => setShowArchived(checked === true)}
          />
          {fi.athletes.showArchived}
        </Label>
      </div>

      {filteredAthletes === undefined && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {Array.from({ length: 12 }).map((_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable placeholder key
            <li key={`skeleton-${index}`} className="flex">
              <AthleteCardSkeleton />
            </li>
          ))}
        </ul>
      )}

      {filteredAthletes !== undefined && filteredAthletes.length === 0 && (
        <p className="text-muted-foreground">
          {isFiltered ? fi.athletes.emptyFiltered : fi.athletes.empty}
        </p>
      )}

      {filteredAthletes !== undefined && filteredAthletes.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {filteredAthletes.map((athlete) => (
            <li key={athlete._id} className="flex">
              <AthleteCard
                athleteId={athlete._id}
                name={athlete.name}
                gender={athlete.gender}
                active={athlete.active}
                imageUrl={athlete.imageUrl}
                crop={athlete.crop}
                imageWidth={athlete.imageWidth}
                imageHeight={athlete.imageHeight}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type AthleteCardProps = {
  athleteId: Id<"athletes">
  name: string
  gender: "M" | "W"
  active: boolean
  imageUrl: string | null
  imageWidth: number | undefined
  imageHeight: number | undefined
  crop: { x: number; y: number; width: number; height: number }
}

function AthleteCardSkeleton() {
  // Mirrors AthleteCard: same Card wrapper, same 4:5 image area, same
  // text-sm + text-xs CardHeader rows. The Skeleton heights use the `lh`
  // CSS unit so they match the inherited text line-height exactly,
  // preventing any layout shift when the real data arrives.
  return (
    <Card className="group relative w-full pt-0! transition-shadow" size="sm">
      <Skeleton className="aspect-4/5 w-full rounded-none" />
      <CardHeader>
        <CardTitle className="wrap-break-word line-clamp-2 min-h-[2lh] text-sm leading-tight">
          <Skeleton className="h-lh w-3/4 rounded-md" />
        </CardTitle>
        <CardDescription className="truncate text-xs">
          <Skeleton className="h-lh w-1/2 rounded-md" />
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function AthleteCard({
  athleteId,
  name,
  gender,
  active,
  imageUrl,
  imageWidth,
  imageHeight,
  crop,
}: AthleteCardProps) {
  return (
    <Card
      className="group relative w-full pt-0! transition-shadow hover:shadow-lg"
      size="sm"
    >
      <PortraitPreview
        imageUrl={imageUrl}
        crop={crop}
        alt={name}
        imageWidth={imageWidth}
        imageHeight={imageHeight}
      />
      <CardHeader>
        <CardTitle
          // Reserve a fixed 2-line height so all cards align regardless
          // of whether the name fits on one line or wraps to two.
          className="wrap-break-word line-clamp-2 min-h-[2lh] text-sm leading-tight"
          title={name}
        >
          <Link
            href={`/athletes/${athleteId}`}
            className="rounded-xl outline-none before:absolute before:inset-0 before:rounded-[inherit] before:content-[''] hover:underline focus-visible:before:ring-3 focus-visible:before:ring-ring/30"
          >
            {name}
          </Link>
        </CardTitle>
        <CardDescription className="truncate text-xs">
          {gender === "M"
            ? fi.athletes.fields.genderM
            : fi.athletes.fields.genderW}
          {!active && ` · ${fi.athletes.archivedTab}`}
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function useDetectedNaturalSize(
  url: string | null,
  enabled: boolean
): { w: number; h: number } | null {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)

  useEffect(() => {
    if (!enabled || !url) {
      setSize(null)
      return
    }
    let cancelled = false
    const img = new window.Image()
    img.onload = () => {
      if (!cancelled) setSize({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.src = url
    return () => {
      cancelled = true
    }
  }, [url, enabled])

  return size
}

function PortraitPreview({
  imageUrl,
  crop,
  alt,
  imageWidth,
  imageHeight,
}: {
  imageUrl: string | null
  crop: { x: number; y: number; width: number; height: number }
  alt: string
  imageWidth: number | undefined
  imageHeight: number | undefined
}) {
  const needsDetection = imageWidth === undefined || imageHeight === undefined
  const detected = useDetectedNaturalSize(imageUrl, needsDetection)
  const naturalW = imageWidth ?? detected?.w
  const naturalH = imageHeight ?? detected?.h

  if (!imageUrl) {
    return <div className="aspect-4/5 w-full bg-muted" />
  }
  if (!naturalW || !naturalH) {
    return <div className="aspect-4/5 w-full bg-muted" />
  }
  // Render the full image inside an overflow-hidden 4:5 box, scaled and
  // shifted so the crop region exactly fills the box. next/image then sees
  // a fixed-size container and serves an appropriately-resized JPEG/AVIF
  // instead of the raw source blob.
  return (
    <div className="relative aspect-4/5 w-full overflow-hidden bg-muted">
      <div
        className="absolute"
        style={{
          width: `${(naturalW * 100) / crop.width}%`,
          height: `${(naturalH * 100) / crop.height}%`,
          left: `${(-crop.x * 100) / crop.width}%`,
          top: `${(-crop.y * 100) / crop.height}%`,
        }}
      >
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes="(min-width: 1280px) 14vw, (min-width: 1024px) 17vw, (min-width: 768px) 20vw, (min-width: 640px) 33vw, 50vw"
          className="object-fill"
          unoptimized={false}
        />
      </div>
    </div>
  )
}
