import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError } from "convex/values"
import type { Id } from "../_generated/dataModel"
import type { MutationCtx, QueryCtx } from "../_generated/server"

export async function requireUser(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new ConvexError("Et ole kirjautunut sisään.")
  }
  return userId
}

export type ClubMembership = {
  userId: Id<"users">
  clubId: Id<"clubs">
  role: "admin" | "member"
}

export async function requireClubMember(
  ctx: QueryCtx | MutationCtx
): Promise<ClubMembership> {
  const userId = await requireUser(ctx)
  const membership = await ctx.db
    .query("clubMemberships")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first()
  if (!membership) {
    throw new ConvexError("Ei seurajäsenyyttä.")
  }
  return {
    userId: membership.userId,
    clubId: membership.clubId,
    role: membership.role,
  }
}

export async function requireClubAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<ClubMembership> {
  const membership = await requireClubMember(ctx)
  if (membership.role !== "admin") {
    throw new ConvexError("Vain ylläpitäjä voi tehdä tämän toiminnon.")
  }
  return membership
}
