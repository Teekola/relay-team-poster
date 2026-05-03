import { getAuthUserId } from "@convex-dev/auth/server"
import { mutation, query } from "./_generated/server"
import { requireUser } from "./lib/auth"

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx)
    const user = await ctx.db.get(userId)
    if (!user) return null
    const membership = await ctx.db
      .query("clubMemberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()
    return {
      id: user._id,
      email: user.email,
      name: user.name,
      clubId: membership?.clubId ?? null,
      role: membership?.role ?? null,
    }
  },
})

export const bootstrapMembership = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx)

    const existing = await ctx.db
      .query("clubMemberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()
    if (existing) {
      return { clubId: existing.clubId, role: existing.role }
    }

    let club = await ctx.db.query("clubs").first()
    if (!club) {
      const clubId = await ctx.db.insert("clubs", {
        name: "Angelniemen Ankkuri",
      })
      const created = await ctx.db.get(clubId)
      if (!created) {
        throw new Error("Failed to create default club.")
      }
      club = created
    }

    const firstMember = await ctx.db
      .query("clubMemberships")
      .withIndex("by_club", (q) => q.eq("clubId", club._id))
      .first()
    const role: "admin" | "member" = firstMember === null ? "admin" : "member"

    await ctx.db.insert("clubMemberships", {
      userId,
      clubId: club._id,
      role,
    })

    return { clubId: club._id, role }
  },
})

export const myMembership = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const membership = await ctx.db
      .query("clubMemberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first()
    if (!membership) return null
    return {
      userId: membership.userId,
      clubId: membership.clubId,
      role: membership.role,
    }
  },
})
