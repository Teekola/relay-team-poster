# Ubiquitous language

Use these terms consistently across code, schema, UI copy, commit messages, and documentation. The codebase is in English; user-facing strings are in Finnish (see `messages/fi.ts`). When the Finnish term differs meaningfully from the English one, both are listed below.

## Domain

### Athlete (FI: *urheilija* / *juoksija*)

A runner in the club's pool. The atomic record managed by the application.

Fields:
- **name** — full name as displayed on team images.
- **photo** — a single source image stored in Convex storage.
- **crop** — non-destructive `{ x, y, width, height }` in source-image pixel coordinates defining how the photo fits the 4:5 portrait frame. Original photo is preserved; the crop is applied at render time.
- **gender** — `M` or `W`. Used to filter the athlete picker for gender-specific relays.
- **active** — soft-archive flag. Inactive athletes don't appear in the picker by default but are preserved in past saved team images.

### Pool (FI: *poolista*)

The set of all athletes for a club. Managed via the `/athletes` page.

### Layout (FI: *asettelu*)

Code-defined poster geometry: canvas dimensions, athlete slot positions, text slot positions. One file per relay size in `layouts/`. Layouts are not user-editable — they ship with the application. Currently: `relay2`, `relay3`, `relay4`, `relay7`, `relay10`, `relay25`.

### Slot (FI: *paikka*)

A positioned region inside a layout. Two kinds:
- **AthleteSlot** — `{ x, y, w, h, numberX, numberY, nameX, nameY, nameMaxWidth }`. Each layout has exactly `requiredAthleteCount` athlete slots.
- **TextSlot** — `{ key, label, x, y, fontSize, fontWeight, transform, align, maxWidth }`. Identifies a piece of header/footer text the user fills in for each team image.

### Template (FI: *malli*)

A DB record pairing one layout (by `layoutId`) with one uploaded background image and a user-chosen name. Multiple templates can share a layout — e.g., one "Jukola 2026" template and one "Tiomila 2027" template both using the `relay7` layout but with different sponsor backgrounds.

### Background image (FI: *taustakuva*)

The pre-designed canvas image with sponsor logos and club branding baked in. Dimensions must match the layout's `canvas` exactly. Uploaded once per template via the `/templates` page.

### Crop (FI: *rajaus*)

Per-athlete, non-destructive `{ x, y, width, height }` in source-image pixel coordinates describing the 4:5 portrait frame to extract. Stored on the athlete record. Applied at render time via Konva's `<Image crop={...}>`.

### Roster (FI: *joukkue*)

The ordered list of athletes selected for a team image. Length must equal the layout's `requiredAthleteCount`.

### Team image (FI: *joukkuekuva*)

A saved record `{ template, roster, textValues, name }` from which a PNG can be rendered on demand. The PNG itself is *not* persisted server-side — only the recipe.

### Club (FI: *seura*)

The owning organization. Single-tenant for now: every domain record carries a `clubId` so multi-tenant support is purely additive.

## Process

### Create flow

The `/teams/new` flow: user picks a template → fills text slots → picks athletes in order → live preview renders → user saves → optionally exports PNG.

### Export

Generating the high-resolution PNG by calling `stage.toDataURL({ pixelRatio: 3 })` on the Konva `<Stage>`. Downloads in the user's browser. Requires fonts to be loaded first.
