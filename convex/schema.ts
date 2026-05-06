import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  ...authTables,

  clubs: defineTable({
    name: v.string(),
  }),

  clubMemberships: defineTable({
    userId: v.id("users"),
    clubId: v.id("clubs"),
    role: v.union(v.literal("admin"), v.literal("member")),
  })
    .index("by_user", ["userId"])
    .index("by_club", ["clubId"])
    .index("by_user_and_club", ["userId", "clubId"]),

  athletes: defineTable({
    clubId: v.id("clubs"),
    name: v.string(),
    nickname: v.optional(v.string()),
    // Image fields are optional so the AI flow can create placeholder
    // athletes without a photo; renderer falls back to a grey box.
    imageStorageId: v.optional(v.id("_storage")),
    imageWidth: v.optional(v.number()),
    imageHeight: v.optional(v.number()),
    crop: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
        width: v.number(),
        height: v.number(),
      })
    ),
    gender: v.union(v.literal("M"), v.literal("W")),
    active: v.boolean(),
  })
    .index("by_club", ["clubId"])
    .index("by_club_and_active", ["clubId", "active"]),

  templates: defineTable({
    clubId: v.id("clubs"),
    aspect: v.union(v.literal("square"), v.literal("portrait")),
    name: v.string(),
    backgroundStorageId: v.id("_storage"),
  })
    .index("by_club", ["clubId"])
    .index("by_club_and_aspect", ["clubId", "aspect"]),

  teamImages: defineTable({
    clubId: v.id("clubs"),
    templateId: v.id("templates"),
    layoutId: v.string(),
    name: v.string(),
    // Positional. `null` marks a previously-filled slot whose athlete was
    // deleted — kept so later legs don't shift left.
    athleteOrder: v.array(v.union(v.id("athletes"), v.null())),
    textValues: v.record(v.string(), v.string()),
  }).index("by_club", ["clubId"]),
})
