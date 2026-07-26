# FleetPro

Live fleet tracking for professional vehicles — a dispatch control center where the map is the
ground and the instruments float over it.

Twelve vans drive looping routes around Paris. Positions, duty cycles, speed and distance covered
refresh every two seconds, on a light, dense, keyboard-driven dashboard.

## Stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------- |
| Framework  | [Nuxt 4](https://nuxt.com) (Vue 3, TypeScript)                 |
| Styling    | [Tailwind CSS 4](https://tailwindcss.com) — tokens in `app/assets/css/main.css` |
| Map        | [MapLibre GL](https://maplibre.org) + CARTO Positron basemap   |
| Auth       | [nuxt-auth-utils](https://github.com/atinux/nuxt-auth-utils) sealed sessions |
| Database   | Cloudflare D1 (SQLite)                                         |
| Hosting    | Cloudflare Workers (Nitro `cloudflare_module` preset)          |

## Features

- **Command bar** — fleet size, vehicles in transit, idle, average speed and distance covered today,
  plus live link health ("Live · 2s ago" / "Reconnecting").
- **Roster rail** — search by plate, driver or model (`/` to focus), status filters, sorting, and
  full keyboard operation (`↑`/`↓` to select, `⏎` to center the map on a vehicle).
- **Vehicle dossier** — speed, heading, distance today, position, rated cruise speed, a countdown to
  the next stop or restart, and a **duty ribbon**: a tachograph-style strip of drive/stop blocks over
  the trailing hour.
- **Live map** — heading-oriented markers interpolated between polls, the selected vehicle's planned
  route and travelled breadcrumb trail, hover tooltips, fit-the-fleet framing and a follow mode.
- **Built for the browser it runs in** — responsive to 375px, visible keyboard focus, reduced-motion
  support, polling that pauses on a hidden tab and backs off when the feed fails.

## How the simulation works

No positions are stored. Each vehicle owns a looping route (a JSON array of `[lng, lat]` waypoints),
a cruise speed and a starting offset. `simulateFleet()` in `server/utils/fleet.ts` derives the
position, heading and duty state for a given timestamp:

- a deterministic duty cycle of 11 minutes driving followed by a 3 minute stop,
- staggered per vehicle so the fleet never stops all at once,
- the same timestamp always produces the same snapshot, on any Worker instance.

That keeps the whole thing stateless: D1 holds the registry, the maths holds the movement.

## Getting started

```bash
pnpm install
pnpm db:migrate:local   # apply migrations to the local D1 database
pnpm dev                # http://localhost:3000
```

Demo account: `demo@florianargaud.com` / `12345678`.

The fleet seeds itself on the first authenticated request, so the dashboard is populated
immediately after signing in.

### Scripts

| Command                  | What it does                             |
| ------------------------ | ---------------------------------------- |
| `pnpm dev`               | Dev server with HMR                      |
| `pnpm lint`              | ESLint (Nuxt config)                     |
| `pnpm typecheck`         | `vue-tsc` over the whole project         |
| `pnpm build`             | Production build                         |
| `pnpm db:migrate:local`  | Apply D1 migrations locally              |
| `pnpm db:migrate:remote` | Apply D1 migrations to the remote database |
| `pnpm deploy`            | Build, then `wrangler deploy`            |

### Configuration

| Variable                 | Purpose                                              |
| ------------------------ | ---------------------------------------------------- |
| `NUXT_SESSION_PASSWORD`  | 32+ character key used to seal session cookies. **Required in production.** |
| `NUXT_DEMO_EMAIL`        | Overrides the demo account email                     |
| `NUXT_DEMO_PASSWORD`     | Overrides the demo account password                  |

## Deployment

```bash
wrangler d1 create vroumvroum          # once — copy the id into wrangler.jsonc
pnpm db:migrate:remote
wrangler secret put NUXT_SESSION_PASSWORD
pnpm deploy
```

## Project layout

```
app/
  components/    CommandBar, FleetRoster, FleetMap, VehicleDossier, DutyRibbon…
  composables/   useFleet (polling + link health), useFleetStats, useNow
  pages/         index.vue (dispatch board), login.vue
  utils/         formatting helpers (compass points, countdowns, coordinates)
server/
  api/           vehicles.get.ts, routes.get.ts, auth/
  utils/         fleet.ts — the simulator, seeding and geo helpers
shared/types/    types shared between client and server
migrations/      D1 schema
```

## Design notes

Light theme only, on asphalt-tinted paper with hairline rules and tight radii. Archivo for the
interface, IBM Plex Mono for every number an operator reads off the screen. Teal means in transit,
graphite means idle, and hi-vis orange is reserved for selection and primary actions — so the one
colour that shouts always means "this is the thing you picked".

---

Need customization, new features, or just looking for a freelance agentic developer?
Contact me: [florianargaud.com](https://florianargaud.com/)
