import { Password } from "@convex-dev/auth/providers/Password"
import { convexAuth } from "@convex-dev/auth/server"
import { ConvexError } from "convex/values"

const ALLOWED_EMAILS = (process.env.AUTH_ALLOWLIST ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = String(params.email ?? "")
          .trim()
          .toLowerCase()
        const flow = String(params.flow ?? "")

        if (flow === "signUp" && !ALLOWED_EMAILS.includes(email)) {
          throw new ConvexError({
            kind: "notAllowlisted",
            message:
              "Tämä sähköposti ei ole kutsulistalla. Pyydä ylläpitäjältä pääsyä.",
          })
        }

        const name = params.name ? String(params.name) : email.split("@")[0]
        return { email, name }
      },
    }),
  ],
})
