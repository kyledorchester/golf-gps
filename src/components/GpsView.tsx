"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { CourseGpsDataset, HoleGpsData, LatLng } from "@/lib/gps-kmz/types";
import { haversineMeters, metersToYards } from "@/lib/gps-kmz/haversine";

interface Props {
  dataset: CourseGpsDataset;
  onReset: () => void;
  primaryColor?: string;
}

interface GeoState {
  position: LatLng | null;
  accuracy: number | null;
  error: string | null;
  denied: boolean;
}

const TEE_ORDER = ["BLUE", "WHITE", "RED", "GOLD", "BLACK"];

const TEE_COLORS: Record<string, { bg: string; text: string }> = {
  BLUE:  { bg: "#2563eb", text: "#fff" },
  WHITE: { bg: "#ffffff", text: "#111" },
  RED:   { bg: "#dc2626", text: "#fff" },
  GOLD:  { bg: "#d97706", text: "#fff" },
  BLACK: { bg: "#1f2937", text: "#fff" },
};

export default function GpsView({ dataset, onReset, primaryColor = "#a80602" }: Props) {
  const [holeIndex, setHoleIndex] = useState(0);
  const [selectedTee, setSelectedTee] = useState<string | null>(null);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [geo, setGeo] = useState<GeoState>({ position: null, accuracy: null, error: null, denied: false });
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [shotMark, setShotMark] = useState<LatLng | null>(null);
  const watchIdRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wakeLockRef = useRef<any>(null); // WakeLockSentinel not yet in all TS lib.dom versions

  // Guard: empty dataset (shouldn't happen after parser validation, but be safe)
  if (!dataset.holes || dataset.holes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1a1a" }}>
        <p style={{ color: "#6b7280" }}>No hole data found in this course file.</p>
      </div>
    );
  }

  const safeIndex = Math.min(holeIndex, dataset.holes.length - 1);
  const hole: HoleGpsData = dataset.holes[safeIndex];
  const availableTees = [
    ...TEE_ORDER.filter((t) => hole.tees[t]),
    ...Object.keys(hole.tees).filter((t) => !TEE_ORDER.includes(t)).sort(),
  ];

  // Reset tee selection when hole changes; reset shot mark too
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    setSelectedTee((prev) => (prev && hole.tees[prev] ? prev : availableTees[0] ?? null));
    setShotMark(null);
  // availableTees is derived from hole which changes with holeIndex — holeIndex is the correct dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeIndex]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleGeoSuccess = useCallback((pos: GeolocationPosition) => {
    setGeo({
      position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      accuracy: pos.coords.accuracy,
      error: null,
      denied: false,
    });
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const handleGeoError = useCallback((err: GeolocationPositionError) => {
    setGeo((prev) => ({
      ...prev,
      error: err.message,
      denied: err.code === err.PERMISSION_DENIED,
    }));
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo((prev) => ({ ...prev, error: "Geolocation not supported.", denied: false }));
      return;
    }
    // Always clear existing watch before (re)starting — prevents multiple simultaneous watchers
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (autoUpdate) {
      watchIdRef.current = navigator.geolocation.watchPosition(handleGeoSuccess, handleGeoError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [autoUpdate, handleGeoSuccess, handleGeoError]);

  // Screen wake lock — keep screen on while on the course
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    async function requestWakeLock() {
      if ("wakeLock" in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        } catch {
          // Permission denied or not supported — silently ignore
        }
      }
    }
    requestWakeLock();

    function onVisibilityChange() {
      if (document.visibilityState === "visible") requestWakeLock();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      wakeLockRef.current?.release();
    };
  }, []);

  // Validate manual coords — reject NaN and out-of-range values
  const manualPosition: LatLng | null = (() => {
    if (!manualLat || !manualLng) return null;
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  })();

  const effectivePosition: LatLng | null = manualPosition ?? geo.position;

  function yards(target: LatLng | null): number | null {
    if (!target || !effectivePosition) return null;
    return Math.round(metersToYards(haversineMeters(effectivePosition, target)));
  }

  const front  = yards(hole.green.front  ?? null);
  const center = yards(hole.green.center ?? null);
  const back   = yards(hole.green.back   ?? null);

  // Static tee-to-green distance from KMZ data (no GPS needed)
  const teePos = selectedTee ? (hole.tees[selectedTee] ?? null) : null;
  const greenTarget = hole.green.center ?? hole.green.front ?? hole.green.back ?? null;
  const teeDistance = teePos && greenTarget
    ? Math.round(metersToYards(haversineMeters(teePos, greenTarget)))
    : null;

  // Shot distance tracker
  const shotDistance = shotMark && effectivePosition
    ? Math.round(metersToYards(haversineMeters(shotMark, effectivePosition)))
    : null;

  const prevHole = () => setHoleIndex((i) => Math.max(0, i - 1));
  const nextHole = () => setHoleIndex((i) => Math.min(dataset.holes.length - 1, i + 1));

  const hasGps = !!geo.position && !manualPosition;
  const accuracyOk = geo.accuracy !== null && geo.accuracy <= 20;

  const gpsStatusColor = manualPosition ? "#d97706" : hasGps ? (accuracyOk ? "#4ade80" : "#facc15") : "#4b5563";
  const gpsStatusText = manualPosition
    ? "Manual position"
    : hasGps
    ? geo.accuracy !== null ? `GPS ±${Math.round(geo.accuracy)}m` : "GPS active"
    : geo.error ? "No GPS" : "Acquiring GPS...";

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto" style={{ background: "#1a1a1a" }}>

      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: "#111111", borderBottom: `3px solid ${primaryColor}` }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: primaryColor }}>
            Golf GPS
          </p>
          <h1 className="text-base font-bold leading-tight text-white">{dataset.courseName}</h1>
        </div>
        <button
          onClick={onReset}
          className="text-xs font-semibold rounded-full px-4 py-1.5"
          style={{ background: "#1a1a1a", color: "#d1d5db", border: "1px solid #374151" }}
        >
          Change Course
        </button>
      </div>

      {/* Hole selector */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={prevHole}
            disabled={holeIndex === 0}
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold disabled:opacity-20"
            style={{ background: "#242424", color: "#fff", border: "1px solid #333" }}
          >
            ‹
          </button>
          <div className="flex-1 text-center">
            <select
              value={safeIndex}
              onChange={(e) => setHoleIndex(parseInt(e.target.value))}
              className="text-white text-4xl font-black text-center border-none outline-none cursor-pointer w-full"
              style={{ background: "transparent" }}
            >
              {dataset.holes.map((h, i) => (
                <option key={h.hole} value={i} style={{ background: "#242424", fontSize: 16 }}>
                  Hole {h.hole}
                </option>
              ))}
            </select>
            {hole.par && (
              <p className="text-xs font-semibold uppercase tracking-widest mt-0.5" style={{ color: "#6b7280" }}>
                Par {hole.par}
              </p>
            )}
          </div>
          <button
            onClick={nextHole}
            disabled={safeIndex === dataset.holes.length - 1}
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold disabled:opacity-20"
            style={{ background: "#242424", color: "#fff", border: "1px solid #333" }}
          >
            ›
          </button>
        </div>

        {/* Tee selector */}
        {availableTees.length > 0 && (
          <div className="flex justify-center gap-2 mt-4">
            {availableTees.map((tee) => {
              const style = TEE_COLORS[tee] ?? { bg: "#374151", text: "#fff" };
              const isSelected = selectedTee === tee;
              return (
                <button
                  key={tee}
                  onClick={() => setSelectedTee(tee)}
                  className="px-5 py-1.5 rounded-full text-sm font-bold transition-all"
                  style={{
                    background: style.bg,
                    color: style.text,
                    opacity: isSelected ? 1 : 0.4,
                    outline: isSelected ? `2px solid ${primaryColor}` : "none",
                    outlineOffset: 2,
                    transform: isSelected ? "scale(1.05)" : "scale(1)",
                    border: tee === "WHITE" ? "1px solid #555" : "none",
                  }}
                >
                  {tee}
                </button>
              );
            })}
          </div>
        )}

        {/* Tee distance */}
        {teeDistance !== null && (
          <p className="text-center text-xs mt-3" style={{ color: "#6b7280" }}>
            Tee distance:{" "}
            <span className="font-bold" style={{ color: "#9ca3af" }}>{teeDistance} yds</span>
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4" style={{ height: 1, background: "#2f2f2f" }} />

      {/* Yardage cards */}
      <div className="px-4 pt-5 pb-4 flex flex-col gap-3">
        {(!hole.green.front && !hole.green.center && !hole.green.back) ? (
          <p className="text-center mt-4" style={{ color: "#4b5563" }}>No green data for this hole.</p>
        ) : (
          <>
            {hole.green.front  && <YardageCard label="Front"  value={front}  primaryColor={primaryColor} />}
            {hole.green.center && <YardageCard label="Center" value={center} primaryColor={primaryColor} primary />}
            {hole.green.back   && <YardageCard label="Back"   value={back}   primaryColor={primaryColor} />}
          </>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4" style={{ height: 1, background: "#2f2f2f" }} />

      {/* Shot distance tracker */}
      <div className="px-4 py-4">
        {!shotMark ? (
          <button
            onClick={() => effectivePosition && setShotMark(effectivePosition)}
            disabled={!effectivePosition}
            title={!effectivePosition ? "Waiting for GPS lock" : "Tap to mark your current position"}
            className="w-full font-bold py-4 rounded-xl text-base disabled:opacity-30 transition-opacity"
            style={{ background: primaryColor, color: "#fff" }}
          >
            Mark Shot
          </button>
        ) : (
          <div
            className="rounded-xl px-5 py-4 flex items-center justify-between"
            style={{ background: "#242424", border: `1px solid ${primaryColor}40` }}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: primaryColor }}>
                Shot Distance
              </p>
              <p className="font-black tabular-nums leading-none" style={{ fontSize: 56, color: "#fff" }}>
                {shotDistance !== null ? shotDistance : <span style={{ fontSize: 28, color: "#4b5563" }}>—</span>}
                {shotDistance !== null && (
                  <span className="text-base font-semibold ml-2" style={{ color: "#9ca3af" }}>yds</span>
                )}
              </p>
            </div>
            <button
              onClick={() => setShotMark(null)}
              className="text-xs font-semibold rounded-full px-4 py-2 ml-4"
              style={{ background: "#333", color: "#d1d5db", border: "1px solid #444" }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4" style={{ height: 1, background: "#2f2f2f" }} />

      {/* GPS status bar */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: gpsStatusColor }} />
            <span className="text-xs" style={{ color: "#9ca3af" }}>{gpsStatusText}</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs" style={{ color: "#6b7280" }}>Auto</span>
            <div
              onClick={() => setAutoUpdate((v) => !v)}
              className="w-9 h-5 rounded-full relative cursor-pointer"
              style={{ background: autoUpdate ? primaryColor : "#374151" }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: autoUpdate ? "translateX(16px)" : "translateX(2px)" }}
              />
            </div>
          </label>
        </div>

        {/* Manual coords — dev only */}
        {process.env.NODE_ENV === "development" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number" step="any" placeholder="Lat (test)"
                value={manualLat} onChange={(e) => setManualLat(e.target.value)}
                className="text-white text-xs rounded-lg px-3 py-2 outline-none"
                style={{ background: "#242424", border: "1px solid #333" }}
              />
              <input
                type="number" step="any" placeholder="Lng (test)"
                value={manualLng} onChange={(e) => setManualLng(e.target.value)}
                className="text-white text-xs rounded-lg px-3 py-2 outline-none"
                style={{ background: "#242424", border: "1px solid #333" }}
              />
            </div>
            {manualPosition && (
              <p className="text-xs mt-1.5 text-center" style={{ color: "#d97706" }}>
                Using manual coords — clear to use GPS
              </p>
            )}
          </>
        )}
      </div>

    </div>
  );
}

function YardageCard({
  label, value, primaryColor, primary = false,
}: {
  label: string;
  value: number | null;
  primaryColor: string;
  primary?: boolean;
}) {
  return (
    <div
      className="rounded-xl px-6 py-5 flex items-center justify-between"
      style={{
        background: primary ? "#242424" : "#1e1e1e",
        border: primary ? `1px solid ${primaryColor}40` : "1px solid #2f2f2f",
      }}
    >
      <span
        className="font-semibold uppercase tracking-widest text-sm"
        style={{ color: primary ? primaryColor : "#9ca3af" }}
      >
        {label}
      </span>
      <span
        className="font-black tabular-nums"
        style={{ fontSize: primary ? 64 : 52, color: primary ? "#ffffff" : "#d1d5db", lineHeight: 1 }}
      >
        {value !== null ? value : <span style={{ fontSize: 28, color: "#4b5563" }}>—</span>}
      </span>
    </div>
  );
}
