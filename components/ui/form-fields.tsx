"use client"

import type { ComponentProps, ReactNode } from "react"
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type FormControlProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  control: ControllerProps<TFieldValues, TName>["control"]
  name: TName
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
  className?: string
  labelClassName?: string
}

type FormControlFunc<
  Extra extends Record<string, unknown> = Record<never, never>,
> = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(
  props: FormControlProps<TFieldValues, TName> & Extra
) => ReactNode

type FormBaseProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> = FormControlProps<TFieldValues, TName> & {
  children: (
    field: Parameters<
      ControllerProps<TFieldValues, TName>["render"]
    >[number]["field"] & {
      "aria-invalid": boolean
      id: string
    }
  ) => ReactNode
}

export function FormBase<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  control,
  name,
  label,
  description,
  disabled,
  className,
  labelClassName,
  children,
}: FormBaseProps<TFieldValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className={className}>
          {label && (
            <FieldLabel className={labelClassName} htmlFor={field.name}>
              {label}
            </FieldLabel>
          )}
          {children({
            ...field,
            disabled: field.disabled ?? disabled,
            id: field.name,
            "aria-invalid": fieldState.invalid,
          })}
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

export const FormInput: FormControlFunc<{
  type?: ComponentProps<"input">["type"]
  inputMode?: ComponentProps<"input">["inputMode"]
  autoComplete?: ComponentProps<"input">["autoComplete"]
  placeholder?: string
  isLoading?: boolean
}> = ({ type, inputMode, autoComplete, placeholder, isLoading, ...props }) => (
  <FormBase {...props}>
    {(field) => (
      <Input
        {...field}
        value={field.value ?? ""}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        isLoading={isLoading}
        aria-invalid={field["aria-invalid"]}
      />
    )}
  </FormBase>
)

type Option = { value: string; label: ReactNode; disabled?: boolean }

export const FormSelect: FormControlFunc<{
  options: Option[]
  placeholder?: string
  isLoading?: boolean
}> = ({ options, placeholder, isLoading, ...props }) => (
  <FormBase {...props}>
    {(field) => (
      <Select
        value={field.value ?? null}
        disabled={field.disabled || isLoading}
        onValueChange={field.onChange}
      >
        <SelectTrigger
          id={field.id}
          isLoading={isLoading}
          className="w-full"
          aria-invalid={field["aria-invalid"]}
          onBlur={field.onBlur}
        >
          <SelectValue placeholder={placeholder}>
            {(value) =>
              options.find((opt) => opt.value === value)?.label ?? null
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )}
  </FormBase>
)

export const FormRadioGroup: FormControlFunc<{
  options: Option[]
  isLoading?: boolean
  orientation?: "vertical" | "horizontal"
}> = ({
  options,
  isLoading,
  orientation = "vertical",
  control,
  name,
  label,
  description,
  disabled,
  className,
}) => (
  <Controller
    control={control}
    name={name}
    render={({ field, fieldState }) => (
      <FieldSet data-invalid={fieldState.invalid} className={className}>
        {(label || description) && (
          <FieldContent className="space-y-1">
            {label && <FieldLegend variant="label">{label}</FieldLegend>}
            {description && <FieldDescription>{description}</FieldDescription>}
          </FieldContent>
        )}
        <RadioGroup
          name={field.name}
          value={field.value ?? ""}
          onValueChange={field.onChange}
          disabled={disabled}
          isLoading={isLoading}
          aria-invalid={fieldState.invalid}
          className={cn(orientation === "horizontal" && "flex flex-row gap-6")}
        >
          {options.map((opt) => (
            <Label
              key={opt.value}
              htmlFor={`${field.name}-${opt.value}`}
              className={cn(
                "flex cursor-pointer items-center gap-2 font-normal text-sm",
                (disabled || opt.disabled) && "opacity-50"
              )}
            >
              <RadioGroupItem
                value={opt.value}
                id={`${field.name}-${opt.value}`}
                disabled={disabled || opt.disabled}
              />
              {opt.label}
            </Label>
          ))}
        </RadioGroup>
        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
      </FieldSet>
    )}
  />
)
