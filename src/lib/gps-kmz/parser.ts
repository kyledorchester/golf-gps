import type { CourseGpsDataset, HoleGpsData, KmzParseResult, LatLng } from "./types";

const TEE_PATTERN   = /^H(\d{2})_TEE_([A-Z]+)$/;
const GREEN_PATTERN = /^H(\d{2})_GREEN_(FRONT|CENTER|BACK)$/;
const PAR_PATTERN   = /^H(\d{2})_PAR_(\d+)$/;

function parseCoordinates(coordString: string): LatLng | null {
  const parts = coordString.trim().split(",");
  if (parts.length < 2) return null;
  const lng = parseFloat(parts[0]);
  const lat = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

function extractPlacemarks(kmlText: string): Array<{ name: string; coords: LatLng | null }> {
  const results: Array<{ name: string; coords: LatLng | null }> = [];
  if (typeof DOMParser === "undefined") return results;

  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, "text/xml");
  const placemarks = doc.getElementsByTagName("Placemark");

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const nameEl = pm.getElementsByTagName("name")[0];
    if (!nameEl) continue;
    const name = nameEl.textContent?.trim() ?? "";
    if (!name) continue;

    const pointEl = pm.getElementsByTagName("Point")[0];
    if (pointEl) {
      const coordEl = pointEl.getElementsByTagName("coordinates")[0];
      const coords = coordEl ? parseCoordinates(coordEl.textContent ?? "") : null;
      results.push({ name, coords });
    } else {
      // No geometry (e.g. PAR markers stored as plain placemarks) — still record the name
      results.push({ name, coords: null });
    }
  }
  return results;
}

export async function parseKmzBlob(file: Blob, courseName?: string): Promise<KmzParseResult> {
  try {
    const JSZip = (await import("jszip")).default;
    try {
      const zip = await JSZip.loadAsync(file);
      const kmlFiles = Object.keys(zip.files).filter((n) => n.toLowerCase().endsWith(".kml"));
      if (kmlFiles.length === 0) {
        return { success: false, error: "No KML file found inside the KMZ archive." };
      }
      const kmlText = await zip.files[kmlFiles[0]].async("string");
      if (!kmlText) return { success: false, error: "KML file was empty." };
      return parseKmlText(kmlText, courseName ?? "Unknown Course");
    } catch {
      // Not a valid ZIP — treat as raw KML text
      const text = await file.text();
      return parseKmlText(text, courseName ?? "Unknown Course");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Failed to parse file: ${message}` };
  }
}

export function parseKmlText(kmlText: string, courseName: string): KmzParseResult {
  const warnings: string[] = [];
  const placemarks = extractPlacemarks(kmlText);

  if (placemarks.length === 0) {
    return { success: false, error: "No placemarks found in KML." };
  }

  const holeMap = new Map<number, HoleGpsData>();

  function getOrCreateHole(holeNum: number): HoleGpsData {
    if (!holeMap.has(holeNum)) {
      holeMap.set(holeNum, { hole: holeNum, tees: {}, green: {} });
    }
    return holeMap.get(holeNum)!;
  }

  for (const { name, coords } of placemarks) {
    // Par — no coords needed
    const parMatch = name.match(PAR_PATTERN);
    if (parMatch) {
      const holeNum = parseInt(parMatch[1], 10);
      const par = parseInt(parMatch[2], 10);
      getOrCreateHole(holeNum).par = par;
      continue;
    }

    if (!coords) continue; // remaining types all need coordinates

    const teeMatch = name.match(TEE_PATTERN);
    if (teeMatch) {
      const holeNum = parseInt(teeMatch[1], 10);
      getOrCreateHole(holeNum).tees[teeMatch[2]] = coords;
      continue;
    }

    const greenMatch = name.match(GREEN_PATTERN);
    if (greenMatch) {
      const holeNum = parseInt(greenMatch[1], 10);
      const pos = greenMatch[2].toLowerCase() as "front" | "center" | "back";
      getOrCreateHole(holeNum).green[pos] = coords;
      continue;
    }

    warnings.push(`Unrecognized placemark ignored: "${name}"`);
  }

  const holes = Array.from(holeMap.values()).sort((a, b) => a.hole - b.hole);

  if (holes.length === 0) {
    return {
      success: false,
      error: "No recognized hole data found. Check naming: H01_TEE_BLUE, H01_GREEN_FRONT, H01_PAR_4.",
    };
  }

  // Warn if hole numbers are non-sequential (e.g. skipped holes in KMZ)
  for (let i = 0; i < holes.length; i++) {
    if (holes[i].hole !== i + 1) {
      warnings.push(`Hole numbering is not sequential: expected ${i + 1}, got ${holes[i].hole}. Check KMZ placemark names.`);
      break;
    }
  }

  // Warn on holes missing all green data
  for (const h of holes) {
    if (!h.green.front && !h.green.center && !h.green.back) {
      warnings.push(`Hole ${h.hole}: no green coordinates found (need H${String(h.hole).padStart(2,"0")}_GREEN_FRONT/CENTER/BACK).`);
    }
  }

  return { success: true, dataset: { courseName, holes }, warnings };
}
