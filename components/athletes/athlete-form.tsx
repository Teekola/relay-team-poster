"use client"

import { InformationCircleIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useMutation } from "convex/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
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
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/convex/_generated/api"
import type { Doc, Id } from "@/convex/_generated/dataModel"
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
  /**
   * True while the parent is still fetching the athlete record. The form
   * mounts immediately so its dimensions are stable; inputs render in a
   * loading state and switch to the real values once data lands.
   */
  isLoading?: boolean
}

type FormValues = {
  name: string
  gender: "M" | "W"
}

type PendingPhoto = {
  blobUrl: string
  file: File
  naturalWidth: number
  naturalHeight: number
}

export function AthleteForm({ athlete, isLoading }: Props) {
  const router = useRouter()
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const createAthlete = useMutation(api.athletes.create)
  const updateAthlete = useMutation(api.athletes.update)

  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null)
  const [crop, setCrop] = useState<Crop | null>(athlete?.crop ?? null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  // Default closed. Opens automatically when the user uploads a new photo
  // (since they almost certainly want to adjust the crop right after).
  const [isCropOpen, setIsCropOpen] = useState(false)

  const form = useForm<FormValues>({
    defaultValues: {
      name: athlete?.name ?? "",
      gender: athlete?.gender ?? "M",
    },
  })

  useEffect(() => {
    return () => {
      if (pendingPhoto) URL.revokeObjectURL(pendingPhoto.blobUrl)
    }
  }, [pendingPhoto])

  // When the athlete record arrives (transition from undefined → object),
  // sync the form values so the displayed inputs reflect the loaded data.
  // Without this, RHF's defaultValues only apply at mount and the form
  // would stay empty.
  useEffect(() => {
    if (athlete) {
      form.reset({ name: athlete.name, gender: athlete.gender })
      setCrop(athlete.crop)
    }
  }, [athlete, form])

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

  async function uploadFile(file: File): Promise<Id<"_storage">> {
    const uploadUrl = await generateUploadUrl()
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    })
    if (!result.ok) {
      throw new Error(`Upload failed: ${result.status}`)
    }
    const { storageId } = (await result.json()) as {
      storageId: Id<"_storage">
    }
    return storageId
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    setError(null)

    if (!athlete && !pendingPhoto) {
      setError("Lataa valokuva.")
      return
    }
    if (!crop) {
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
          gender: values.gender,
          crop,
          ...(storageId
            ? {
                imageStorageId: storageId,
                imageWidth: pendingPhoto?.naturalWidth,
                imageHeight: pendingPhoto?.naturalHeight,
              }
            : {}),
        })
      } else {
        if (!pendingPhoto) {
          setError("Lataa valokuva.")
          return
        }
        const storageId = await uploadFile(pendingPhoto.file)
        await createAthlete({
          name: values.name,
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
    (crop.x !== athlete.crop.x ||
      crop.y !== athlete.crop.y ||
      crop.width !== athlete.crop.width ||
      crop.height !== athlete.crop.height)
  const isDirty = form.formState.isDirty || pendingPhoto !== null || cropChanged
  const canSave = athlete
    ? isDirty
    : isDirty && pendingPhoto !== null && crop !== null

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Show the notice whenever we're in an edit context — including
             the loading state — so the form doesn't shift down when data
             arrives. (The /new route passes athlete=null with no isLoading,
             so the notice stays hidden there.) */}
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
        <Controller
          name="name"
          control={form.control}
          rules={{ required: fi.common.requiredField, minLength: 1 }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                {fi.athletes.fields.name}
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
          name="gender"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel>{fi.athletes.fields.gender}</FieldLabel>
              <RadioGroup
                value={field.value}
                onValueChange={(value) => field.onChange(value)}
                className="flex flex-row gap-6"
                isLoading={isLoading}
              >
                <Label className="flex cursor-pointer items-center gap-2 font-normal text-sm">
                  <RadioGroupItem value="M" />
                  {fi.athletes.fields.genderM}
                </Label>
                <Label className="flex cursor-pointer items-center gap-2 font-normal text-sm">
                  <RadioGroupItem value="W" />
                  {fi.athletes.fields.genderW}
                </Label>
              </RadioGroup>
            </Field>
          )}
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

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading || isSaving || !canSave}>
          {isSaving && <Spinner />}
          {isSaving ? fi.common.saving : fi.athletes.actions.save}
        </Button>
      </div>
    </form>
  )
}
