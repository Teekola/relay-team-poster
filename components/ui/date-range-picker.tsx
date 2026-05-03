"use client"

import { Calendar01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { fi as fiLocale } from "date-fns/locale"
import { useState } from "react"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type Props = {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  placeholder?: string
  className?: string
  isLoading?: boolean
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("fi-FI")
}

export function DateRangePicker({
  value,
  onChange,
  placeholder,
  className,
  isLoading,
}: Props) {
  const [open, setOpen] = useState(false)
  if (isLoading) {
    return (
      <div
        aria-busy="true"
        data-slot="date-range-picker-loading"
        className={cn(
          "h-9 w-full animate-pulse rounded-3xl bg-muted",
          className
        )}
      />
    )
  }
  const label =
    value?.from && value?.to
      ? `${formatDate(value.from)} – ${formatDate(value.to)}`
      : value?.from
        ? `${formatDate(value.from)} – …`
        : (placeholder ?? "")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "justify-start rounded-3xl border-transparent bg-input/50 font-normal text-base hover:bg-input/70 md:text-sm dark:bg-input/50 dark:hover:bg-input/70",
              !value?.from && "text-muted-foreground",
              className
            )}
          >
            <HugeiconsIcon icon={Calendar01Icon} aria-hidden />
            {label}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
          locale={fiLocale}
        />
      </PopoverContent>
    </Popover>
  )
}
