"use client"

import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
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

export type ComboboxOption<TValue extends string = string> = {
  value: TValue
  label: string
  /** Extra strings used for fuzzy match in addition to `label`. */
  keywords?: string[]
}

type Props<TValue extends string> = {
  options: ComboboxOption<TValue>[]
  value: TValue | null
  /**
   * Called with the picked option's value, or with `null` when the user
   * clears the current selection via the inline "x" button.
   */
  onChange: (value: TValue | null) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  isLoading?: boolean
  /** When true, hides the inline clear button even if a value is set. */
  clearable?: boolean
}

export function Combobox<TValue extends string = string>({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  className,
  disabled,
  isLoading,
  clearable = true,
}: Props<TValue>) {
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
  const showClear = clearable && !disabled && selected !== null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative inline-flex w-full", className)}>
        <PopoverTrigger
          disabled={disabled}
          render={
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start rounded-3xl border-transparent bg-input/50 font-normal hover:bg-input/70 dark:bg-input/50 dark:hover:bg-input/70",
                !selected && "text-muted-foreground",
                showClear && "pr-9"
              )}
            >
              {selected?.label ?? placeholder}
            </Button>
          }
        />
        {showClear && (
          <button
            type="button"
            aria-label="Tyhjennä valinta"
            // Stop propagation so opening the popover and clearing don't
            // both fire on the same click; pointerdown also has to be
            // stopped because the trigger button reacts to pointerdown
            // before click in some browsers.
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onChange(null)
            }}
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-3xl text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:bg-muted focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:ring-inset"
          >
            <HugeiconsIcon
              icon={Cancel01Icon}
              strokeWidth={2}
              className="size-4"
              aria-hidden
            />
          </button>
        )}
      </div>
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
