import type { CourseGpsDataset, HoleGpsData, KmzParseResult, LatLng } from "./types";

// Regex patterns for placemark name parsing
// Expected formats: H01_TEE_BLUE, H09_GREEN_FRONT, H18_GREEN_CENTER, H03_GREEN_BACK
const TEE_PATTERN = /^H(\d{2})_TEE_([A-Z]+)$/;
const GREEN_PATTERN = /^H(\d{2})_GREEN_(FRONT|CENTER|BACK)$/;

function parseCoordinates(coordString: string): LatLng | null {
  const trimmed = coordString.trim();
  const parts = trimmed.split(",");
  if (parts.length < 2) return null;
  const lng = parseFloat(parts[0]);
  const lat = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

function extractPlacemarks(kmlText: string): Array<{ name: string; coords: LatLng }> {
  const results: Array<{ name: string; coords: LatLng }> = [];
  // Use DOMParser if available (browser), otherwise use regex fallback
  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(kmlText, "text/xml");
    const placemarks = doc.getElementsByTagName("Placemark");
    for (let i = 0; i < placemarks.length; i++) {
      const pm = placemarks[i];
      const nameEl = pm.getElementsByTagName("name")[0];
      if (!nameEl) continue;
      const name = nameEl.textContent?.trim() ?? "";
      if (!name) continue;
      // Try Point coordinates first
      const pointEl = pm.getElementsByTagName("Point")[0];
      if (pointEl) {
        const coordEl = pointEl.getElementsByTagName("coordinates")[0];
        if (coordEl) {
          const coords = parseCoordinates(coordEl.textContent ?? "");
          if (coords) {
            results.push({ name, coords });
          }
        }
      }
    }
  }
  return results;
}

export async function parseKmzBlob(file: Blob, courseName?: string): Promise<KmzParseResult> {
  try {
    // Dynamic import so bundler only loads JSZip when needed
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(file);

    // Find the first .kml file inside the zip
    let kmlText: string | null = null;
    const kmlFiles = Object.keys(zip.files).filter(
      (name) => name.toLowerCase().endsWith(".kml")
    );
    if (kmlFiles.length === 0) {
      return { success: false, error: "No KML file found inside the KMZ archive." };
    }
    kmlText = await zip.files[kmlFiles[0]].async("string");

    if (!kmlText) {
      return { success: false, error: "KML file was empty." };
    }

    return parseKmlText(kmlText, courseName ?? "Unknown Course");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to parse KMZ: ${message}` };
  }
}

export function parseKmlText(kmlText: string, courseName: string): KmzParseResult {
  const warnings: string[] = [];
  const placemarks = extractPlacemarks(kmlText);

  if (placemarks.length === 0) {
    return { success: false, error: "No Point placemarks found in KML." };
  }

  // Build a map of hole data keyed by hole number
  const holeMap = new Map<number, HoleGpsData>();

  function getOrCreateHole(holeNum: number): HoleGpsData {
    if (!holeMap.has(holeNum)) {
      holeMap.set(holeNum, {
        hole: holeNum,
        tees: {},
        green: {},
      });
    }
    return holeMap.get(holeNum)!;
  }

  for (const { name, coords } of placemarks) {
    const teeMatch = name.match(TEE_PATTERN);
    if (teeMatch) {
      const holeNum = parseInt(teeMatch[1], 10);
      const color = teeMatch[2];
      const hole = getOrCreateHole(holeNum);
      hole.tees[color] = coords;
      continue;
    }

    const greenMatch = name.match(GREEN_PATTERN);
    if (greenMatch) {
      const holeNum = parseInt(greenMatch[1], 10);
      const position = greenMatch[2].toLowerCase() as "front" | "center" | "back";
      const hole = getOrCreateHole(holeNum);
      hole.green[position] = coords;
      continue;
    }

    // Unknown placemark — log warning but do not crash
    warnings.push(`Unrecognized placemark name ignored: "${name}"`);
  }

  // Sort holes by number
  const holes = Array.from(holeMap.values()).sort((a, b) => a.hole - b.hole);

  if (holes.length === 0) {
    return { success: false, error: "No recognized hole data found. Check placemark naming conventions (e.g. H01_TEE_BLUE, H01_GREEN_FRONT)." };
  }

  return {
    success: true,
    dataset: { courseName, holes },
    warnings,
  };
}
