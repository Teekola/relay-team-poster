import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireClubMember } from "./lib/auth"

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireClubMember(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    await requireClubMember(ctx)
    return await ctx.storage.getUrl(storageId)
  },
})
