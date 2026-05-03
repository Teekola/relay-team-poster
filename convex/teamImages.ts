import { ConvexError, v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { requireClubAdmin, requireClubMember } from "./lib/auth"

const textValuesValidator = v.record(v.string(), v.string())

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { clubId } = await requireClubMember(ctx)
    const items = await ctx.db
      .query("teamImages")
      .withIndex("by_club", (q) => q.eq("clubId", clubId))
      .order("desc")
      .take(500)

    const templateCache = new Map<
      Id<"templates">,
      { aspect: "square" | "portrait" } | null
    >()
    const athleteNameCache = new Map<Id<"athletes">, string | null>()

    async function resolveAthleteName(
      id: Id<"athletes">
    ): Promise<string | null> {
      const cached = athleteNameCache.get(id)
      if (cached !== undefined) return cached
      const athlete = await ctx.db.get(id)
      const name = athlete && athlete.clubId === clubId ? athlete.name : null
      athleteNameCache.set(id, name)
      return name
    }

    return await Promise.all(
      items.map(async (item) => {
        let cached = templateCache.get(item.templateId)
        if (cached === undefined) {
          const template = await ctx.db.get(item.templateId)
          if (!template || template.clubId !== clubId) {
            cached = null
          } else {
            cached = { aspect: template.aspect }
          }
          templateCache.set(item.templateId, cached)
        }
        const athleteNames = await Promise.all(
          item.athleteOrder.map((aid) => (aid ? resolveAthleteName(aid) : null))
        )
        return {
          ...item,
          templateAspect: cached?.aspect ?? null,
          athleteNames,
        }
      })
    )
  },
})

export const get = query({
  args: { id: v.id("teamImages") },
  handler: async (ctx, { id }) => {
    const { clubId } = await requireClubMember(ctx)
    const teamImage = await ctx.db.get(id)
    if (!teamImage || teamImage.clubId !== clubId) return null
    return teamImage
  },
})

export const create = mutation({
  args: {
    templateId: v.id("templates"),
    layoutId: v.string(),
    name: v.string(),
    athleteOrder: v.array(v.id("athletes")),
    textValues: textValuesValidator,
  },
  handler: async (ctx, args) => {
    const { clubId } = await requireClubMember(ctx)

    const trimmedName = args.name.trim()
    if (trimmedName.length === 0) {
      throw new ConvexError("Nimi ei voi olla tyhjä.")
    }

    const template = await ctx.db.get(args.templateId)
    if (!template || template.clubId !== clubId) {
      throw new ConvexError("Mallia ei löydy.")
    }

    if (args.athleteOrder.length === 0) {
      throw new ConvexError("Joukkue ei voi olla tyhjä.")
    }

    for (const athleteId of args.athleteOrder) {
      const athlete = await ctx.db.get(athleteId)
      if (!athlete || athlete.clubId !== clubId) {
        throw new ConvexError("Yksi tai useampi urheilija ei kuulu seuraan.")
      }
    }

    return await ctx.db.insert("teamImages", {
      clubId,
      templateId: args.templateId,
      layoutId: args.layoutId,
      name: trimmedName,
      athleteOrder: args.athleteOrder,
      textValues: args.textValues,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id("teamImages"),
    name: v.optional(v.string()),
    layoutId: v.optional(v.string()),
    templateId: v.optional(v.id("templates")),
    athleteOrder: v.optional(v.array(v.union(v.id("athletes"), v.null()))),
    textValues: v.optional(textValuesValidator),
  },
  handler: async (ctx, args) => {
    const { clubId } = await requireClubMember(ctx)

    const existing = await ctx.db.get(args.id)
    if (!existing || existing.clubId !== clubId) {
      throw new ConvexError("Joukkuekuvaa ei löydy.")
    }

    const patch: Partial<Doc<"teamImages">> = {}

    if (args.name !== undefined) {
      const trimmed = args.name.trim()
      if (trimmed.length === 0) {
        throw new ConvexError("Nimi ei voi olla tyhjä.")
      }
      patch.name = trimmed
    }

    if (args.layoutId !== undefined) {
      patch.layoutId = args.layoutId
    }

    if (args.templateId !== undefined) {
      const template = await ctx.db.get(args.templateId)
      if (!template || template.clubId !== clubId) {
        throw new ConvexError("Mallia ei löydy.")
      }
      patch.templateId = args.templateId
    }

    if (args.athleteOrder !== undefined) {
      if (args.athleteOrder.length === 0) {
        throw new ConvexError("Joukkue ei voi olla tyhjä.")
      }
      for (const athleteId of args.athleteOrder) {
        if (athleteId === null) continue
        const athlete = await ctx.db.get(athleteId)
        if (!athlete || athlete.clubId !== clubId) {
          throw new ConvexError("Yksi tai useampi urheilija ei kuulu seuraan.")
        }
      }
      patch.athleteOrder = args.athleteOrder
    }

    if (args.textValues !== undefined) {
      patch.textValues = args.textValues
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.id, patch)
    }
    return args.id
  },
})

export const duplicate = mutation({
  args: { id: v.id("teamImages"), newName: v.optional(v.string()) },
  handler: async (ctx, { id, newName }) => {
    const { clubId } = await requireClubMember(ctx)
    const existing = await ctx.db.get(id)
    if (!existing || existing.clubId !== clubId) {
      throw new ConvexError("Joukkuekuvaa ei löydy.")
    }
    const trimmedName = (newName ?? `${existing.name} (kopio)`).trim()
    if (trimmedName.length === 0) {
      throw new ConvexError("Nimi ei voi olla tyhjä.")
    }
    return await ctx.db.insert("teamImages", {
      clubId,
      templateId: existing.templateId,
      layoutId: existing.layoutId,
      name: trimmedName,
      athleteOrder: existing.athleteOrder,
      textValues: existing.textValues,
    })
  },
})

export const remove = mutation({
  args: { id: v.id("teamImages") },
  handler: async (ctx, { id }) => {
    const { clubId } = await requireClubAdmin(ctx)
    const existing = await ctx.db.get(id)
    if (!existing || existing.clubId !== clubId) {
      throw new ConvexError("Joukkuekuvaa ei löydy.")
    }
    await ctx.db.delete(id)
    return id
  },
})
