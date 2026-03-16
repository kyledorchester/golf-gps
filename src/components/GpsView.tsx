"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { CourseGpsDataset, HoleGpsData, LatLng } from "@/lib/gps-kmz/types";
import { haversineMeters, metersToYards } from "@/lib/gps-kmz/haversine";

interface Props {
  dataset: CourseGpsDataset;
  onReset: () => void;
}

interface GeoState {
  position: LatLng | null;
  accuracy: number | null;
  error: string | null;
  denied: boolean;
}

const TEE_ORDER = ["BLUE", "WHITE", "RED", "GOLD", "BLACK"];

const TEE_STYLE: Record<string, { bg: string; text: string }> = {
  BLUE:  { bg: "bg-blue-600",   text: "text-white" },
  WHITE: { bg: "bg-white",      text: "text-black" },
  RED:   { bg: "bg-red-600",    text: "text-white" },
  GOLD:  { bg: "bg-yellow-500", text: "text-black" },
  BLACK: { bg: "bg-gray-800 border border-gray-500", text: "text-white" },
};

export default function GpsView({ dataset, onReset }: Props) {
  const [holeIndex, setHoleIndex] = useState(0);
  const [selectedTee, setSelectedTee] = useState<string | null>(null);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [geo, setGeo] = useState<GeoState>({ position: null, accuracy: null, error: null, denied: false });
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const watchIdRef = useRef<number | null>(null);

  const hole: HoleGpsData = dataset.holes[holeIndex];
  const availableTees = [
    ...TEE_ORDER.filter((t) => hole.tees[t]),
    ...Object.keys(hole.tees).filter((t) => !TEE_ORDER.includes(t)).sort(),
  ];

  useEffect(() => {
    setSelectedTee((prev) => (prev && hole.tees[prev] ? prev : availableTees[0] ?? null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeIndex]);

  const handleGeoSuccess = useCallback((pos: GeolocationPosition) => {
    setGeo({
      position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      accuracy: pos.coords.accuracy,
      error: null,
      denied: false,
    });
  }, []);

  const handleGeoError = useCallback((err: GeolocationPositionError) => {
    setGeo((prev) => ({
      ...prev,
      error: err.message,
      denied: err.code === err.PERMISSION_DENIED,
    }));
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo((prev) => ({ ...prev, error: "Geolocation not supported.", denied: false }));
      return;
    }
    if (autoUpdate) {
      watchIdRef.current = navigator.geolocation.watchPosition(handleGeoSuccess, handleGeoError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [autoUpdate, handleGeoSuccess, handleGeoError]);

  const manualPosition: LatLng | null =
    manualLat && manualLng ? { lat: parseFloat(manualLat), lng: parseFloat(manualLng) } : null;
  const effectivePosition: LatLng | null = manualPosition ?? geo.position;

  function yards(target: LatLng | null): number | null {
    if (!target || !effectivePosition) return null;
    return Math.round(metersToYards(haversineMeters(effectivePosition, target)));
  }

  const front = yards(hole.green.front ?? null);
  const center = yards(hole.green.center ?? null);
  const back = yards(hole.green.back ?? null);

  const prevHole = () => setHoleIndex((i) => Math.max(0, i - 1));
  const nextHole = () => setHoleIndex((i) => Math.min(dataset.holes.length - 1, i + 1));

  const hasGps = !!geo.position && !manualPosition;
  const accuracyOk = geo.accuracy !== null && geo.accuracy <= 20;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col max-w-md mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-2">
        <div>
          <p className="text-green-400 text-xs font-semibold uppercase tracking-widest">Golf GPS</p>
          <h1 className="text-lg font-bold leading-tight">{dataset.courseName}</h1>
        </div>
        <button
          onClick={onReset}
          className="text-gray-500 hover:text-white text-xs border border-gray-700 rounded-lg px-3 py-1.5 transition-colors"
        >
          Change Course
        </button>
      </div>

      {/* Hole selector */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={prevHole}
            disabled={holeIndex === 0}
            className="w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 disabled:opacity-20 flex items-center justify-center text-2xl font-bold transition-colors"
          >
            ‹
          </button>
          <div className="flex-1 text-center">
            <select
              value={holeIndex}
              onChange={(e) => setHoleIndex(parseInt(e.target.value))}
              className="bg-transparent text-white text-3xl font-black text-center border-none outline-none cursor-pointer w-full"
            >
              {dataset.holes.map((h, i) => (
                <option key={h.hole} value={i} className="bg-gray-900 text-base">
                  Hole {h.hole}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={nextHole}
            disabled={holeIndex === dataset.holes.length - 1}
            className="w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 disabled:opacity-20 flex items-center justify-center text-2xl font-bold transition-colors"
          >
            ›
          </button>
        </div>

        {/* Tee selector */}
        {availableTees.length > 0 && (
          <div className="flex justify-center gap-2 mt-3">
            {availableTees.map((tee) => {
              const style = TEE_STYLE[tee] ?? { bg: "bg-gray-600", text: "text-white" };
              const isSelected = selectedTee === tee;
              return (
                <button
                  key={tee}
                  onClick={() => setSelectedTee(tee)}
                  className={`px-5 py-1.5 rounded-full text-sm font-bold transition-all
                    ${style.bg} ${style.text}
                    ${isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-gray-950 scale-105" : "opacity-50"}`}
                >
                  {tee}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-800 mx-4" />

      {/* Yardages — the main event */}
      <div className="flex-1 px-4 py-6 flex flex-col gap-4">

        {(!hole.green.front && !hole.green.center && !hole.green.back) ? (
          <p className="text-center text-gray-600 mt-8">No green data for this hole.</p>
        ) : (
          <>
            {hole.green.front && (
              <YardageCard label="Front" value={front} accent="text-gray-300" />
            )}
            {hole.green.center && (
              <YardageCard label="Center" value={center} accent="text-green-400" primary />
            )}
            {hole.green.back && (
              <YardageCard label="Back" value={back} accent="text-gray-300" />
            )}
          </>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-800 mx-4" />

      {/* GPS status bar */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${hasGps ? (accuracyOk ? "bg-green-400" : "bg-yellow-400") : "bg-gray-600"}`} />
            <span className="text-xs text-gray-400">
              {manualPosition
                ? "Manual position"
                : hasGps
                ? geo.accuracy !== null
                  ? `GPS \u00b1${Math.round(geo.accuracy)}m`
                  : "GPS active"
                : geo.error
                ? "No GPS"
                : "Acquiring GPS..."}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <span className="text-xs text-gray-500">Auto</span>
              <div
                onClick={() => setAutoUpdate((v) => !v)}
                className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${autoUpdate ? "bg-green-600" : "bg-gray-700"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${autoUpdate ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </label>
          </div>
        </div>

        {/* Manual coords */}
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="any"
            placeholder="Lat (test)"
            value={manualLat}
            onChange={(e) => setManualLat(e.target.value)}
            className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 placeholder-gray-600"
          />
          <input
            type="number"
            step="any"
            placeholder="Lng (test)"
            value={manualLng}
            onChange={(e) => setManualLng(e.target.value)}
            className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 placeholder-gray-600"
          />
        </div>
        {manualPosition && (
          <p className="text-yellow-500 text-xs mt-1.5 text-center">Using manual coords — clear to use GPS</p>
        )}
      </div>

    </div>
  );
}

function YardageCard({
  label,
  value,
  accent,
  primary = false,
}: {
  label: string;
  value: number | null;
  accent: string;
  primary?: boolean;
}) {
  return (
    <div className={`rounded-2xl px-6 py-5 flex items-center justify-between ${primary ? "bg-gray-800" : "bg-gray-900"}`}>
      <span className={`font-semibold uppercase tracking-widest text-sm ${accent}`}>{label}</span>
      <span className={`font-black tabular-nums ${primary ? "text-6xl text-white" : "text-5xl text-gray-200"}`}>
        {value !== null ? value : <span className="text-gray-600 text-3xl">—</span>}
      </span>
    </div>
  );
}
