# Project status — handover briefing

## Where to start

1. [`docs/ubiquitous-language.md`](./ubiquitous-language.md) for shared
   vocabulary (Athlete, Layout, Template, Team image, Aspect, …).
2. `convex/_generated/ai/guidelines.md` before changing Convex code.
3. `messages/fi.ts` for all user-facing strings (UI is Finnish, code is
   English).

The app is feature-complete end-to-end: auth + athletes + templates +
team images + Konva-based PNG export at full resolution. All listings,
forms, mobile shell, deletion redirects, and the crop editor have had a
recent polish pass. `pnpm typecheck` is clean.

## Outstanding work

1. **Run `pnpm exec convex dev --once`** to deploy the recent schema /
   mutation changes (`athleteOrder` now allows `null` for cascade
   cleanup; `teamImages.update` now accepts `layoutId` and `templateId`;
   `teamImages.list` now returns `templateBackgroundUrl` and
   `templateAspect` for the listing thumbnails) and regenerate
   `convex/_generated/`.

2. **Loading skeletons + form-error toasts.** Most pages still show a
   bare `Ladataan…`. No toast system is wired up; form errors are
   rendered as inline `<p className="text-destructive">`.

3. **End-to-end visual verification with real brand templates** at
   every relay size. relay2/4/7/25 slot positions are reasonable
   defaults but haven't been tested against the real backgrounds —
   expect tweaks to `lib/layouts/relay{2,4,7,25}.ts`.

4. **Initial Git commit + GitHub repo + Vercel deployment.** The
   project has `.git/` from `shadcn init` but nothing committed yet.
   Vercel env vars: `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`,
   plus Convex Auth's `JWT_PRIVATE_KEY` / `JWKS` / `SITE_URL`.

## Quick commands

```bash
pnpm dev                          # Next.js
pnpm convex                       # Convex watcher
pnpm typecheck
pnpm exec biome check --write     # format + safe fixes
pnpm exec convex dev --once       # deploy schema/functions
```
