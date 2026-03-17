# Golf GPS — Standalone App

Standalone mobile-optimized GPS yardage app for golf courses.
Loads a KMZ/KML course file and shows live distances to the green (Front / Center / Back) based on device location.

**GitHub:** https://github.com/kyledorchester/golf-gps

## Local Path

```
C:\Users\kyledorc\Documents\kyle\GOLF APP\golf-gps
```

## Stack

- Next.js 16, React 19, TypeScript, Tailwind v4
- JSZip (KMZ unzip), DOMParser (KML parse)
- Haversine distance calculation (no external mapping API)
- Browser Geolocation API

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

## Branding

The app accepts a `primaryColor` prop on `<GpsApp />` (default: `#a80602`).
When mounted in the shell app it will receive the org's `primaryColor` from branding.
Base theme matches the shell app: `#1a1a1a` bg, `#242424` cards, `#111111` header, Segoe UI font.

## Loading a Course

- **Upload KMZ or KML** — pick any KMZ or KML file from your device
- **Load Sample** — place `dorchester_ranch.kmz` in `public/` and click the button

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

See `docs/gps-kmz-import.md` for the full guide including how to export from Google Earth Pro.

## Backlog

- [ ] KML (unzipped) file support in parser
- [ ] Course persistence via localStorage (no reload on revisit)
- [ ] Par per hole (`H01_PAR_4` naming convention)
- [ ] PWA / install to home screen (offline support)
- [ ] Shot distance tracker
- [ ] Scorecard / score tracking
- [ ] Hole auto-advance via GPS

## Platform Context

This app is the standalone prototype for the `gps` platform module.
When the shell app is ready it will mount at `/gps`.
The KMZ parser lives in `src/lib/gps-kmz/` and is designed for reuse across modules.
