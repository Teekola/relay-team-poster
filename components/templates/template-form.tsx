"use client"

import { useMutation } from "convex/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { FormActions } from "@/components/forms/form-actions"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"
import { useStorageUpload } from "@/hooks/use-storage-upload"
import { ASPECT_DIMENSIONS, ASPECTS, type Aspect } from "@/lib/layouts"
import { cn } from "@/lib/utils"
import { fi } from "@/messages/fi"

type Props = {
  template: (Doc<"templates"> & { backgroundUrl: string | null }) | null
  isLoading?: boolean
}

type FormValues = {
  name: string
  aspect: Aspect
}

type PendingBackground = {
  blobUrl: string
  file: File
  naturalWidth: number
  naturalHeight: number
}

const ASPECT_SET: ReadonlySet<string> = new Set<string>(ASPECTS)

function isAspect(value: string): value is Aspect {
  return ASPECT_SET.has(value)
}

export function TemplateForm({ template, isLoading }: Props) {
  const router = useRouter()
  const uploadFile = useStorageUpload()
  const createTemplate = useMutation(api.templates.create)
  const updateTemplate = useMutation(api.templates.update)

  const isEditing = template !== null

  const [pendingBackground, setPendingBackground] =
    useState<PendingBackground | null>(null)
  const [dimensionError, setDimensionError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<FormValues>({
    defaultValues: {
      name: template?.name ?? "",
      aspect: template?.aspect ?? "square",
    },
  })

  const selectedAspect = form.watch("aspect")
  const expectedDimensions = ASPECT_DIMENSIONS[selectedAspect]

  useEffect(() => {
    return () => {
      if (pendingBackground) URL.revokeObjectURL(pendingBackground.blobUrl)
    }
  }, [pendingBackground])

  useEffect(() => {
    if (template) {
      form.reset({ name: template.name, aspect: template.aspect })
    }
  }, [template, form])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      setPendingBackground(null)
      setDimensionError(null)
      return
    }
    const blobUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const { w, h } = expectedDimensions
      if (img.naturalWidth !== w || img.naturalHeight !== h) {
        setDimensionError(
          fi.templates.errors.dimensions(
            w,
            h,
            img.naturalWidth,
            img.naturalHeight
          )
        )
        setPendingBackground(null)
        URL.revokeObjectURL(blobUrl)
        return
      }
      setDimensionError(null)
      setPendingBackground({
        blobUrl,
        file,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      setDimensionError(fi.templates.errors.uploadFailed)
      setPendingBackground(null)
    }
    img.src = blobUrl
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    setError(null)

    if (!isEditing && !pendingBackground) {
      setError(fi.templates.errors.uploadFailed)
      return
    }
    if (dimensionError) {
      return
    }

    setIsSaving(true)
    try {
      if (template) {
        const storageId = pendingBackground
          ? await uploadFile(pendingBackground.file)
          : undefined
        await updateTemplate({
          id: template._id,
          name: values.name,
          ...(storageId ? { backgroundStorageId: storageId } : {}),
        })
      } else {
        if (!pendingBackground) {
          setError(fi.templates.errors.uploadFailed)
          return
        }
        const storageId = await uploadFile(pendingBackground.file)
        await createTemplate({
          aspect: values.aspect,
          name: values.name,
          backgroundStorageId: storageId,
        })
      }
      router.push("/templates")
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : fi.templates.errors.saveFailed
      )
    } finally {
      setIsSaving(false)
    }
  })

  const previewSrc =
    pendingBackground?.blobUrl ?? template?.backgroundUrl ?? null
  const isDirty = form.formState.isDirty || pendingBackground !== null
  const baseCanSave = isEditing
    ? isDirty
    : isDirty && pendingBackground !== null
  const canSave = baseCanSave && dimensionError === null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          rules={{ required: fi.common.requiredField, minLength: 1 }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                {fi.templates.fields.name}
              </FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                isLoading={isLoading}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="aspect"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel>{fi.templates.fields.aspect}</FieldLabel>
              <RadioGroup
                value={field.value}
                onValueChange={(value) => {
                  if (typeof value === "string" && isAspect(value)) {
                    field.onChange(value)
                  }
                }}
                disabled={isEditing}
                className="flex flex-row gap-6"
                isLoading={isLoading}
              >
                {ASPECTS.map((aspect) => (
                  <Label
                    key={aspect}
                    className="flex cursor-pointer items-center gap-2 font-normal text-sm"
                  >
                    <RadioGroupItem value={aspect} disabled={isEditing} />
                    {fi.templates.aspects[aspect]}
                  </Label>
                ))}
              </RadioGroup>
            </Field>
          )}
        />

        <Field>
          <FieldLabel>{fi.templates.fields.background}</FieldLabel>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="cursor-pointer"
            isLoading={isLoading}
          />
          <FieldDescription
            className={cn(
              isLoading && "w-fit! animate-pulse rounded-md bg-muted text-muted"
            )}
          >
            {fi.templates.backgroundHint(
              expectedDimensions.w,
              expectedDimensions.h
            )}
          </FieldDescription>
          {dimensionError && (
            <FieldError>
              <span>{dimensionError}</span>
            </FieldError>
          )}
        </Field>

        {(isLoading || previewSrc) && (
          <Field>
            <FieldLabel>{fi.templates.fields.background}</FieldLabel>
            {isLoading ? (
              <div
                className="w-full max-w-md animate-pulse rounded border bg-muted"
                style={{
                  aspectRatio: `${expectedDimensions.w} / ${expectedDimensions.h}`,
                }}
              />
            ) : (
              <img
                src={previewSrc ?? ""}
                alt={template?.name ?? ""}
                className="w-full max-w-md rounded border bg-muted object-contain"
                style={{
                  aspectRatio: `${expectedDimensions.w} / ${expectedDimensions.h}`,
                }}
              />
            )}
          </Field>
        )}
      </FieldGroup>

      <FormActions
        error={error}
        isSaving={isSaving}
        isLoading={isLoading}
        canSave={canSave}
        saveLabel={fi.templates.actions.save}
      />
    </form>
  )
}
