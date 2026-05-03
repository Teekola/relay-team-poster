import { ConvexError, v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, type QueryCtx, query } from "./_generated/server"
import { requireClubAdmin, requireClubMember } from "./lib/auth"

const aspectValidator = v.union(v.literal("square"), v.literal("portrait"))

type TemplateWithUrl = Doc<"templates"> & { backgroundUrl: string | null }

async function withBackgroundUrls(
  ctx: QueryCtx,
  templates: Doc<"templates">[]
): Promise<TemplateWithUrl[]> {
  return Promise.all(
    templates.map(async (template) => ({
      ...template,
      backgroundUrl: await ctx.storage.getUrl(template.backgroundStorageId),
    }))
  )
}

export const list = query({
  args: { aspect: v.optional(aspectValidator) },
  handler: async (ctx, { aspect }) => {
    const { clubId } = await requireClubMember(ctx)
    const all = aspect
      ? await ctx.db
          .query("templates")
          .withIndex("by_club_and_aspect", (q) =>
            q.eq("clubId", clubId).eq("aspect", aspect)
          )
          .take(500)
      : await ctx.db
          .query("templates")
          .withIndex("by_club", (q) => q.eq("clubId", clubId))
          .take(500)
    all.sort((a, b) => a.name.localeCompare(b.name, "fi"))
    return await withBackgroundUrls(ctx, all)
  },
})

export const get = query({
  args: { id: v.id("templates") },
  handler: async (ctx, { id }) => {
    const { clubId } = await requireClubMember(ctx)
    const template = await ctx.db.get(id)
    if (!template || template.clubId !== clubId) return null
    return {
      ...template,
      backgroundUrl: await ctx.storage.getUrl(template.backgroundStorageId),
    }
  },
})

export const create = mutation({
  args: {
    aspect: aspectValidator,
    name: v.string(),
    backgroundStorageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const { clubId } = await requireClubMember(ctx)
    const trimmedName = args.name.trim()
    if (trimmedName.length === 0) {
      throw new ConvexError("Nimi ei voi olla tyhjä.")
    }
    return await ctx.db.insert("templates", {
      clubId,
      aspect: args.aspect,
      name: trimmedName,
      backgroundStorageId: args.backgroundStorageId,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("templates"),
    name: v.optional(v.string()),
    backgroundStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { clubId } = await requireClubMember(ctx)
    const existing = await ctx.db.get(args.id)
    if (!existing || existing.clubId !== clubId) {
      throw new ConvexError("Mallia ei löydy.")
    }

    const patch: Partial<Doc<"templates">> = {}
    if (args.name !== undefined) {
      const trimmed = args.name.trim()
      if (trimmed.length === 0) {
        throw new ConvexError("Nimi ei voi olla tyhjä.")
      }
      patch.name = trimmed
    }

    if (
      args.backgroundStorageId !== undefined &&
      args.backgroundStorageId !== existing.backgroundStorageId
    ) {
      const oldStorageId = existing.backgroundStorageId
      patch.backgroundStorageId = args.backgroundStorageId
      await ctx.db.patch(args.id, patch)
      await ctx.storage.delete(oldStorageId)
      return args.id
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.id, patch)
    }
    return args.id
  },
})

export const remove = mutation({
  args: { id: v.id("templates") },
  handler: async (ctx, { id }): Promise<Id<"templates">> => {
    const { clubId } = await requireClubAdmin(ctx)
    const template = await ctx.db.get(id)
    if (!template || template.clubId !== clubId) {
      throw new ConvexError("Mallia ei löydy.")
    }
    const backgroundStorageId = template.backgroundStorageId
    await ctx.db.delete(id)
    await ctx.storage.delete(backgroundStorageId)
    return id
  },
})
