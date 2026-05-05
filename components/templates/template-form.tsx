"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "convex/react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { FormActions } from "@/components/forms/form-actions"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { FormInput, FormRadioGroup } from "@/components/ui/form-fields"
import { Input } from "@/components/ui/input"
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

const templateSchema = z.object({
  name: z.string().min(1, fi.common.requiredField),
  aspect: z.enum(ASPECTS as readonly [Aspect, ...Aspect[]]),
})

type FormValues = z.infer<typeof templateSchema>

type PendingBackground = {
  blobUrl: string
  file: File
  naturalWidth: number
  naturalHeight: number
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

  const formValues = useMemo<FormValues | undefined>(() => {
    if (!template) return undefined
    return { name: template.name, aspect: template.aspect }
  }, [template])

  const form = useForm<FormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: { name: "", aspect: "square" },
    values: formValues,
    resetOptions: { keepDirtyValues: true },
  })

  const selectedAspect = form.watch("aspect")
  const expectedDimensions = ASPECT_DIMENSIONS[selectedAspect]

  useEffect(() => {
    return () => {
      if (pendingBackground) URL.revokeObjectURL(pendingBackground.blobUrl)
    }
  }, [pendingBackground])

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
        <FormInput
          control={form.control}
          name="name"
          label={fi.templates.fields.name}
          isLoading={isLoading}
        />

        <FormRadioGroup
          control={form.control}
          name="aspect"
          label={fi.templates.fields.aspect}
          orientation="horizontal"
          isLoading={isLoading}
          disabled={isEditing}
          options={ASPECTS.map((aspect) => ({
            value: aspect,
            label: fi.templates.aspects[aspect],
          }))}
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
