"use client";

import { useState, useRef } from "react";
import type { CourseGpsDataset } from "@/lib/gps-kmz/types";
import { parseKmzBlob } from "@/lib/gps-kmz/parser";

interface Props {
  onLoad: (dataset: CourseGpsDataset) => void;
  primaryColor?: string;
}

export default function CourseLoader({ onLoad, primaryColor = "#a80602" }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setWarnings([]);
    setLoading(true);
    try {
      const result = await parseKmzBlob(file, file.name.replace(/\.(kmz|kml)$/i, ""));
      if (!result.success) {
        setError(result.error);
      } else {
        if (result.warnings.length > 0) setWarnings(result.warnings);
        onLoad(result.dataset);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function loadSample() {
    setError(null);
    setWarnings([]);
    setLoading(true);
    try {
      const response = await fetch("/dorchester_ranch.kmz");
      if (!response.ok) {
        setError("Sample KMZ not found. Place dorchester_ranch.kmz in public/");
        setLoading(false);
        return;
      }
      const blob = await response.blob();
      const result = await parseKmzBlob(blob, "Dorchester Ranch");
      if (!result.success) {
        setError(result.error);
      } else {
        if (result.warnings.length > 0) setWarnings(result.warnings);
        onLoad(result.dataset);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div
        className="w-full max-w-sm rounded-xl p-8 shadow-xl"
        style={{ background: "#242424", border: "1px solid #333" }}
      >
        {/* Title */}
        <h1
          className="text-3xl font-bold mb-1"
          style={{ color: primaryColor }}
        >
          Golf GPS
        </h1>
        <p className="text-sm mb-8" style={{ color: "#9ca3af" }}>
          Load a course file to get started.
        </p>

        {/* Primary: load sample */}
        <button
          onClick={loadSample}
          disabled={loading}
          className="w-full font-semibold py-3 px-4 rounded-lg mb-4 transition-opacity disabled:opacity-40"
          style={{ background: primaryColor, color: "#fff" }}
        >
          {loading ? "Loading..." : "Load Dorchester Ranch Sample"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: "#333" }} />
          <span className="text-xs" style={{ color: "#6b7280" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "#333" }} />
        </div>

        {/* Secondary: upload */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="w-full font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-40"
          style={{ background: "#333", color: "#d1d5db", border: "1px solid #444" }}
        >
          Upload KMZ / KML File
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".kmz,.kml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {error && (
          <div className="mt-4 rounded-lg p-3 text-sm" style={{ background: "rgba(168,6,2,0.15)", border: "1px solid rgba(168,6,2,0.4)", color: "#fca5a5" }}>
            {error}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mt-4 rounded-lg p-3 text-xs" style={{ background: "rgba(180,83,9,0.15)", border: "1px solid rgba(180,83,9,0.4)", color: "#fcd34d" }}>
            <p className="font-semibold mb-1">Warnings:</p>
            <ul className="list-disc list-inside space-y-1">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        <p className="mt-6 text-center text-xs" style={{ color: "#4b5563" }}>
          KMZ naming: H01_TEE_BLUE, H01_GREEN_FRONT, etc.
        </p>
      </div>
    </div>
  );
}
