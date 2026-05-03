"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export type ComboboxOption = {
  value: string
  label: string
  /** Extra strings used for fuzzy match in addition to `label`. */
  keywords?: string[]
}

type Props = {
  options: ComboboxOption[]
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  isLoading?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  className,
  disabled,
  isLoading,
}: Props) {
  const [open, setOpen] = useState(false)
  if (isLoading) {
    return (
      <div
        aria-busy="true"
        data-slot="combobox-loading"
        className={cn(
          "h-9 w-full animate-pulse rounded-3xl bg-muted",
          className
        )}
      />
    )
  }
  const selected = value
    ? (options.find((option) => option.value === value) ?? null)
    : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "justify-start font-normal",
              !selected && "text-muted-foreground",
              className
            )}
          >
            {selected?.label ?? placeholder}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-[--anchor-width] min-w-72 p-0">
        <Command className="space-y-2">
          <CommandInput placeholder={searchPlaceholder ?? placeholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                keywords={[option.label, ...(option.keywords ?? [])]}
                onSelect={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                {option.label}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
