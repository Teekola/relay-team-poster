import { Input as InputPrimitive } from "@base-ui/react/input"
import type * as React from "react"

import { cn } from "@/lib/utils"

type InputProps = React.ComponentProps<"input"> & {
  /**
   * When true, render a pulse-skeleton placeholder of the same dimensions
   * as the real input. The form can mount before data lands without value
   * flashes — flip this to false once the local state has been seeded.
   */
  isLoading?: boolean
}

function Input({ className, type, isLoading, ...props }: InputProps) {
  if (isLoading) {
    return (
      <div
        aria-busy="true"
        data-slot="input-loading"
        className={cn(
          "h-9 w-full min-w-0 animate-pulse rounded-3xl bg-muted",
          className
        )}
      />
    )
  }
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-3xl border border-transparent bg-input/50 px-3 py-1 text-base outline-none transition-[color,box-shadow,background-color] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
