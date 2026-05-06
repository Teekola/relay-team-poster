"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { InformationCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "convex/react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { FormActions } from "@/components/forms/form-actions"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { FormInput, FormRadioGroup } from "@/components/ui/form-fields"
import { Input } from "@/components/ui/input"
import { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"
import { useStorageUpload } from "@/hooks/use-storage-upload"
import { type Crop, defaultCropForImage } from "@/lib/crop"
import { cn } from "@/lib/utils"
import { fi } from "@/messages/fi"
import { CropEditor } from "./crop-editor"

type Props = {
  athlete:
    | (Doc<"athletes"> & {
        imageUrl: string | null
        referenceCount: number
      })
    | null
  isLoading?: boolean
  // Lets the parent mirror the in-progress name in the header/breadcrumb.
  onNameChange?: (name: string) => void
}

const athleteSchema = z.object({
  name: z.string().min(1, fi.common.requiredField),
  nickname: z.string().trim().max(80).optional(),
  gender: z.enum(["M", "W"]),
})

type FormValues = z.infer<typeof athleteSchema>

type PendingPhoto = {
  blobUrl: string
  file: File
  naturalWidth: number
  naturalHeight: number
}

export function AthleteForm({ athlete, isLoading, onNameChange }: Props) {
  const router = useRouter()
  const uploadFile = useStorageUpload()
  const createAthlete = useMutation(api.athletes.create)
  const updateAthlete = useMutation(api.athletes.update)

  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null)
  const [crop, setCrop] = useState<Crop | null>(athlete?.crop ?? null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  // Auto-opens after a fresh upload — users almost always want to recrop then.
  const [isCropOpen, setIsCropOpen] = useState(false)

  const formValues = useMemo<FormValues | undefined>(() => {
    if (!athlete) return undefined
    return {
      name: athlete.name,
      nickname: athlete.nickname ?? "",
      gender: athlete.gender,
    }
  }, [athlete])

  const form = useForm<FormValues>({
    resolver: zodResolver(athleteSchema),
    defaultValues: { name: "", nickname: "", gender: "M" },
    values: formValues,
    resetOptions: { keepDirtyValues: true },
  })

  useEffect(() => {
    return () => {
      if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.blobUrl)
    }
  }, [pendingPhoto])

  const watchedName = form.watch("name")
  useEffect(() => {
    onNameChange?.(watchedName)
  }, [watchedName, onNameChange])

  useEffect(() => {
    if (athlete) setCrop(athlete.crop ?? null)
  }, [athlete])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const blobUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setPendingPhoto({
        blobUrl,
        file,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      })
      setCrop(defaultCropForImage(img.naturalWidth, img.naturalHeight))
      setIsCropOpen(true)
    }
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      setError("Kuvan lataus epäonnistui.")
    }
    img.src = blobUrl
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    setError(null)

    if (!athlete && !pendingPhoto) {
      setError("Lataa valokuva.")
      return
    }
    // Placeholder athletes have no image yet — editing other fields shouldn't demand a crop.
    const willHaveImage = pendingPhoto !== null || Boolean(athlete?.imageUrl)
    if (willHaveImage && !crop) {
      setError("Säädä rajaus.")
      return
    }

    setIsSaving(true)
    try {
      if (athlete) {
        const storageId = pendingPhoto
          ? await uploadFile(pendingPhoto.file)
          : undefined
        await updateAthlete({
          id: athlete._id,
          name: values.name,
          // Always send so clearing the input clears the stored value.
          nickname: values.nickname ?? "",
          gender: values.gender,
          ...(crop ? { crop } : {}),
          ...(storageId
            ? {
                imageStorageId: storageId,
                imageWidth: pendingPhoto?.naturalWidth,
                imageHeight: pendingPhoto?.naturalHeight,
              }
            : {}),
        })
      } else {
        if (!pendingPhoto || !crop) {
          setError("Lataa valokuva.")
          return
        }
        const storageId = await uploadFile(pendingPhoto.file)
        await createAthlete({
          name: values.name,
          nickname: values.nickname,
          gender: values.gender,
          imageStorageId: storageId,
          imageWidth: pendingPhoto.naturalWidth,
          imageHeight: pendingPhoto.naturalHeight,
          crop,
        })
      }
      router.push("/athletes")
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Tallennus epäonnistui."
      )
    } finally {
      setIsSaving(false)
    }
  })

  const editorImageSrc = pendingPhoto?.blobUrl ?? athlete?.imageUrl ?? null

  const cropChanged =
    athlete !== null &&
    crop !== null &&
    (athlete.crop === undefined ||
      crop.x !== athlete.crop.x ||
      crop.y !== athlete.crop.y ||
      crop.width !== athlete.crop.width ||
      crop.height !== athlete.crop.height)
  const isDirty = form.formState.isDirty || pendingPhoto !== null || cropChanged
  const canSave = athlete
    ? isDirty
    : isDirty && pendingPhoto !== null && crop !== null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Shown during loading too, so the form doesn't shift when data lands. */}
      {(athlete || isLoading) && (
        <p className="-mt-3 flex items-start gap-2 text-muted-foreground text-sm">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            className="mt-0.5 size-4 shrink-0"
            aria-hidden
          />
          <span>{fi.athletes.formNotice.updatesPropagate}</span>
        </p>
      )}
      <FieldGroup>
        <FormInput
          control={form.control}
          name="name"
          label={fi.athletes.fields.name}
          isLoading={isLoading}
        />

        <FormInput
          control={form.control}
          name="nickname"
          label={fi.athletes.fields.nickname}
          description={fi.athletes.fields.nicknameHint}
          isLoading={isLoading}
        />

        <FormRadioGroup
          control={form.control}
          name="gender"
          label={fi.athletes.fields.gender}
          orientation="horizontal"
          isLoading={isLoading}
          options={[
            { value: "M", label: fi.athletes.fields.genderM },
            { value: "W", label: fi.athletes.fields.genderW },
          ]}
        />

        <Field>
          <FieldLabel>{fi.athletes.fields.photo}</FieldLabel>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="cursor-pointer"
            isLoading={isLoading}
          />
          <FieldDescription>{fi.athletes.crop.hint}</FieldDescription>
        </Field>

        {(isLoading || editorImageSrc) && (
          <Field>
            <FieldLabel>{fi.athletes.fields.crop}</FieldLabel>
            <div className="flex w-full flex-col items-start gap-3">
              {isLoading ? (
                <div className="aspect-4/5 w-full max-w-60 animate-pulse rounded-lg border bg-muted" />
              ) : (
                editorImageSrc && (
                  <div
                    className={cn(
                      "w-full max-w-60",
                      !isCropOpen && "pointer-events-none"
                    )}
                  >
                    <CropEditor
                      imageSrc={editorImageSrc}
                      crop={crop}
                      onCropChange={setCrop}
                    />
                  </div>
                )
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCropOpen((open) => !open)}
                disabled={isLoading}
              >
                {isCropOpen ? fi.common.done : fi.athletes.actions.adjustCrop}
              </Button>
            </div>
          </Field>
        )}
      </FieldGroup>

      <FormActions
        error={error}
        isSaving={isSaving}
        isLoading={isLoading}
        canSave={canSave}
        saveLabel={fi.athletes.actions.save}
      />
    </form>
  )
}
