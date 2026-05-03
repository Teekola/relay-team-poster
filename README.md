# relay-team-poster

A web app for generating Instagram-ready team announcement graphics for orienteering relay races. Maintains a pool of athletes (name + photo + crop) and composites them onto club-branded background images using predefined layouts (relay sizes 2, 3, 4, 7, 10, 25).

UI language is Finnish; the codebase is in English. See [docs/ubiquitous-language.md](docs/ubiquitous-language.md) for shared vocabulary.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- shadcn/ui with Base UI primitives
- Convex (database, file storage, auth)
- Convex Auth (Password provider, admin-seeded accounts)
- react-konva for image composition and high-res PNG export
- pnpm + Biome

## Development

```bash
pnpm dev         # Next.js dev server
pnpm convex      # Convex dev watcher (alias for: pnpm exec convex dev)
pnpm check       # Biome format + lint with auto-fix
pnpm typecheck   # tsc --noEmit
```

Run `convex dev` (or `pnpm convex`) in a separate terminal so Convex picks up schema and function changes as you edit them.

## Project structure

```
app/                 Next.js App Router routes
components/          React components (UI primitives in components/ui/)
hooks/               React hooks
lib/                 Shared utilities
layouts/             Code-defined poster geometries (relay2, relay3, ...)
messages/            Localized UI strings (Finnish in fi.ts)
convex/              Convex schema, queries, mutations, auth config
docs/                Project documentation
```

## Deployment

Hosted on Vercel via GitHub integration. Push to main → auto-deploy. Required env vars in Vercel: `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, plus Convex Auth secrets.
