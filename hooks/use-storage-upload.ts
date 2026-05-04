"use client"

import { useMutation } from "convex/react"
import { useCallback } from "react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export function useStorageUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  return useCallback(
    async (file: File): Promise<Id<"_storage">> => {
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
    },
    [generateUploadUrl]
  )
}
