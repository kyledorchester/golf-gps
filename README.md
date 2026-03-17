# Golf GPS — Standalone App

Standalone mobile-optimized GPS yardage app for golf courses.
Loads a KMZ/KML course file and shows live distances to the green (Front / Center / Back) based on device location.

**GitHub:** https://github.com/kyledorchester/golf-gps
**Last commit:** `2b3b42e` — Remove unused HoleMap component and leaflet dependencies

## Local Path

```
C:\Users\kyledorc\Documents\kyle\GOLF APP\golf-gps
```

## Stack

- Next.js 16, React 19, TypeScript, Tailwind v4
- JSZip (KMZ unzip), DOMParser (KML parse)
- Haversine distance calculation (no external mapping API)
- Browser Geolocation API (`watchPosition`)
- Screen Wake Lock API (keeps screen on while on course)
- PWA: `manifest.json` + service worker (`public/sw.js`)

## Run Locally

```bash
cd "C:/Users/kyledorc/Documents/kyle/GOLF APP/golf-gps"
npm install
npm run dev
# → http://localhost:3010
```

## Access From Phone (same Wi-Fi)

```
http://<your-pc-ip>:3010
```

## Access From Phone (on course / cellular)

Start the dev server then run ngrok in a second terminal:

```bash
ngrok http 3010
# Open the https:// URL on your phone
# Note: GPS requires HTTPS — always use the ngrok https:// URL, not http://
```

**ngrok URL (free plan — same each time):** `https://subfestive-socorro-ectatic.ngrok-free.dev`

## Branding

The app accepts a `primaryColor` prop on `<GpsApp />` (default: `#a80602`).
When mounted in the shell app it will receive the org's `primaryColor` from branding.
Base theme matches the shell app: `#1a1a1a` bg, `#242424` cards, `#111111` header, Segoe UI font.

## Features

- **KMZ + KML support** — upload either format; parser tries ZIP first, falls back to raw KML text
- **Sample course** — `public/dorchester_ranch.kmz` loads via the sample button
- **Course persistence** — last loaded course saved to localStorage; survives page refresh
- **Hole navigation** — prev/next arrows + dropdown selector
- **Tee selector** — picks from tees present in KMZ (Blue/White/Red/Gold/Black etc.)
- **Tee distance** — yards from selected tee to center green
- **Green yardages** — Front / Center / Back from live GPS position
- **GPS accuracy** — shown in feet; Auto toggle locks/unlocks position
- **Shot distance tracker** — tap "Mark Shot", walk to ball, shows yards to marked position
- **Screen wake lock** — keeps screen on while app is open (re-acquired on tab visibility change)
- **PWA** — installable to home screen; service worker caches app shell for offline use
- **Dev-only tools** — manual lat/lng input fields hidden in production builds

## KMZ / KML Naming Conventions

Placemarks inside the file must follow this pattern:

| Placemark Name | Meaning |
|---|---|
| `H01_TEE_BLUE` | Hole 1, Blue tee |
| `H01_TEE_WHITE` | Hole 1, White tee |
| `H01_TEE_RED` | Hole 1, Red tee |
| `H01_GREEN_FRONT` | Hole 1, front of green |
| `H01_GREEN_CENTER` | Hole 1, center of green |
| `H01_GREEN_BACK` | Hole 1, back of green |
| `H01_PAR_4` | Hole 1, par 4 |

- Hole numbers: `H01`–`H18` (supports up to `H36` for 27/36-hole courses)
- Par placemarks have no geometry (coordinates ignored)
- Unrecognized placemarks are skipped with a warning shown on the load screen

See `docs/gps-kmz-import.md` for the full guide including how to export from Google Earth Pro.

## Platform Context

This app is the standalone prototype for the `gps` platform module.
When the shell app is ready it will mount at `/gps`.
The KMZ parser lives in `src/lib/gps-kmz/` and is designed for reuse across modules.
PWA / service worker registration moves to the shell level when integrated.

## Backlog

- [ ] Scorecard / score tracking per hole (likely handled by the Players Club module)
- [ ] Hole auto-advance via GPS proximity detection
- [ ] Wind / elevation display (requires external data source)
