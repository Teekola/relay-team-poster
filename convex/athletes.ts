import { ConvexError, v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, type QueryCtx, query } from "./_generated/server"
import { requireClubMember } from "./lib/auth"

const cropValidator = v.object({
  x: v.number(),
  y: v.number(),
  width: v.number(),
  height: v.number(),
})

const genderValidator = v.union(v.literal("M"), v.literal("W"))

type AthleteWithUrl = Doc<"athletes"> & {
  imageUrl: string | null
  referenceCount: number
}

async function buildReferenceCounts(
  ctx: QueryCtx,
  clubId: Id<"clubs">
): Promise<Map<Id<"athletes">, number>> {
  const teamImages = await ctx.db
    .query("teamImages")
    .withIndex("by_club", (q) => q.eq("clubId", clubId))
    .collect()
  const counts = new Map<Id<"athletes">, number>()
  for (const teamImage of teamImages) {
    const seen = new Set<Id<"athletes">>()
    for (const aid of teamImage.athleteOrder) {
      if (aid === null) continue
      if (seen.has(aid)) continue
      seen.add(aid)
      counts.set(aid, (counts.get(aid) ?? 0) + 1)
    }
  }
  return counts
}

async function withImageUrls(
  ctx: QueryCtx,
  athletes: Doc<"athletes">[],
  counts: Map<Id<"athletes">, number>
): Promise<AthleteWithUrl[]> {
  return Promise.all(
    athletes.map(async (athlete) => ({
      ...athlete,
      imageUrl: athlete.imageStorageId
        ? await ctx.storage.getUrl(athlete.imageStorageId)
        : null,
      referenceCount: counts.get(athlete._id) ?? 0,
    }))
  )
}

export const list = query({
  args: {
    includeArchived: v.optional(v.boolean()),
    gender: v.optional(genderValidator),
  },
  handler: async (ctx, { includeArchived, gender }) => {
    const { clubId } = await requireClubMember(ctx)

    const all = includeArchived
      ? await ctx.db
          .query("athletes")
          .withIndex("by_club", (q) => q.eq("clubId", clubId))
          .take(500)
      : await ctx.db
          .query("athletes")
          .withIndex("by_club_and_active", (q) =>
            q.eq("clubId", clubId).eq("active", true)
          )
          .take(500)

    const filtered = gender
      ? all.filter((athlete) => athlete.gender === gender)
      : all
    filtered.sort((a, b) => a.name.localeCompare(b.name, "fi"))
    const counts = await buildReferenceCounts(ctx, clubId)
    return await withImageUrls(ctx, filtered, counts)
  },
})

export const get = query({
  args: { id: v.id("athletes") },
  handler: async (ctx, { id }) => {
    const { clubId } = await requireClubMember(ctx)
    const athlete = await ctx.db.get(id)
    if (!athlete || athlete.clubId !== clubId) return null
    const counts = await buildReferenceCounts(ctx, clubId)
    return {
      ...athlete,
      imageUrl: athlete.imageStorageId
        ? await ctx.storage.getUrl(athlete.imageStorageId)
        : null,
      referenceCount: counts.get(athlete._id) ?? 0,
    }
  },
})

function normalizeNickname(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined
  const trimmed = raw.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

export const create = mutation({
  args: {
    name: v.string(),
    nickname: v.optional(v.string()),
    imageStorageId: v.id("_storage"),
    imageWidth: v.number(),
    imageHeight: v.number(),
    crop: cropValidator,
    gender: genderValidator,
  },
  handler: async (ctx, args) => {
    const { clubId } = await requireClubMember(ctx)
    const trimmedName = args.name.trim()
    if (trimmedName.length === 0) {
      throw new ConvexError("Nimi ei voi olla tyhjä.")
    }
    return await ctx.db.insert("athletes", {
      clubId,
      name: trimmedName,
      nickname: normalizeNickname(args.nickname),
      imageStorageId: args.imageStorageId,
      imageWidth: args.imageWidth,
      imageHeight: args.imageHeight,
      crop: args.crop,
      gender: args.gender,
      active: true,
    })
  },
})

export const createPlaceholder = mutation({
  args: {
    name: v.string(),
    nickname: v.optional(v.string()),
    gender: v.optional(genderValidator),
  },
  handler: async (ctx, args) => {
    const { clubId } = await requireClubMember(ctx)
    const trimmedName = args.name.trim()
    if (trimmedName.length === 0) {
      throw new ConvexError("Nimi ei voi olla tyhjä.")
    }
    return await ctx.db.insert("athletes", {
      clubId,
      name: trimmedName,
      nickname: normalizeNickname(args.nickname),
      gender: args.gender ?? "M",
      active: true,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("athletes"),
    name: v.optional(v.string()),
    nickname: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    imageWidth: v.optional(v.number()),
    imageHeight: v.optional(v.number()),
    crop: v.optional(cropValidator),
    gender: v.optional(genderValidator),
  },
  handler: async (ctx, args) => {
    const { clubId } = await requireClubMember(ctx)
    const existing = await ctx.db.get(args.id)
    if (!existing || existing.clubId !== clubId) {
      throw new ConvexError("Urheilijaa ei löydy.")
    }

    const patch: Partial<Doc<"athletes">> = {}
    if (args.name !== undefined) {
      const trimmed = args.name.trim()
      if (trimmed.length === 0) {
        throw new ConvexError("Nimi ei voi olla tyhjä.")
      }
      patch.name = trimmed
    }
    if (args.nickname !== undefined) {
      patch.nickname = normalizeNickname(args.nickname)
    }
    if (args.crop !== undefined) patch.crop = args.crop
    if (args.gender !== undefined) patch.gender = args.gender
    if (args.imageWidth !== undefined) patch.imageWidth = args.imageWidth
    if (args.imageHeight !== undefined) patch.imageHeight = args.imageHeight

    if (
      args.imageStorageId !== undefined &&
      args.imageStorageId !== existing.imageStorageId
    ) {
      const oldImageId = existing.imageStorageId
      patch.imageStorageId = args.imageStorageId
      await ctx.db.patch(args.id, patch)
      if (oldImageId) {
        await ctx.storage.delete(oldImageId)
      }
      return args.id
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.id, patch)
    }
    return args.id
  },
})

export const archive = mutation({
  args: { id: v.id("athletes") },
  handler: async (ctx, { id }) => {
    const { clubId } = await requireClubMember(ctx)
    const athlete = await ctx.db.get(id)
    if (!athlete || athlete.clubId !== clubId) {
      throw new ConvexError("Urheilijaa ei löydy.")
    }
    if (!athlete.active) return id
    await ctx.db.patch(id, { active: false })
    return id
  },
})

export const restore = mutation({
  args: { id: v.id("athletes") },
  handler: async (ctx, { id }) => {
    const { clubId } = await requireClubMember(ctx)
    const athlete = await ctx.db.get(id)
    if (!athlete || athlete.clubId !== clubId) {
      throw new ConvexError("Urheilijaa ei löydy.")
    }
    if (athlete.active) return id
    await ctx.db.patch(id, { active: true })
    return id
  },
})

export const remove = mutation({
  args: { id: v.id("athletes") },
  handler: async (ctx, { id }): Promise<Id<"athletes">> => {
    const { clubId, role } = await requireClubMember(ctx)
    if (role !== "admin") {
      throw new ConvexError("Vain ylläpitäjä voi poistaa urheilijan.")
    }
    const athlete = await ctx.db.get(id)
    if (!athlete || athlete.clubId !== clubId) {
      throw new ConvexError("Urheilijaa ei löydy.")
    }

    // Refuse to hard-delete athletes that still appear in saved team
    // images — that would either leave empty slots or silently change
    // those rosters' rendering. The user is told to archive instead, or
    // remove the athlete from / delete the referencing team images first.
    const teamImages = await ctx.db
      .query("teamImages")
      .withIndex("by_club", (q) => q.eq("clubId", clubId))
      .collect()
    const referenceCount = teamImages.filter((teamImage) =>
      teamImage.athleteOrder.some((aid) => aid === id)
    ).length
    if (referenceCount > 0) {
      throw new ConvexError({
        kind: "athleteReferenced",
        referenceCount,
      })
    }

    const imageStorageId = athlete.imageStorageId
    await ctx.db.delete(id)
    if (imageStorageId) {
      await ctx.storage.delete(imageStorageId)
    }
    return id
  },
})

// Minimal roster sent into the AI prompt — full `list` would drag image
// metadata into the LLM context for no reason.
export const listForClubMinimal = query({
  args: {},
  handler: async (ctx) => {
    const { clubId } = await requireClubMember(ctx)
    const athletes = await ctx.db
      .query("athletes")
      .withIndex("by_club_and_active", (q) =>
        q.eq("clubId", clubId).eq("active", true)
      )
      .take(500)
    return athletes.map((athlete) => ({
      _id: athlete._id,
      name: athlete.name,
      nickname: athlete.nickname,
      gender: athlete.gender,
    }))
  },
})
