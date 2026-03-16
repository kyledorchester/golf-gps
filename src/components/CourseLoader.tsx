"use client";

import { useState, useRef } from "react";
import type { CourseGpsDataset } from "@/lib/gps-kmz/types";
import { parseKmzBlob } from "@/lib/gps-kmz/parser";

interface Props {
  onLoad: (dataset: CourseGpsDataset) => void;
}

export default function CourseLoader({ onLoad }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setWarnings([]);
    setLoading(true);
    try {
      const result = await parseKmzBlob(file, file.name.replace(/\.kmz$/i, ""));
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
        setError("Sample KMZ not found. Place dorchester_ranch.kmz in apps/gps-standalone/public/");
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
      <div className="bg-gray-900 rounded-2xl p-8 w-full max-w-md shadow-xl">
        <h1 className="text-3xl font-bold text-green-400 mb-2">Golf GPS</h1>
        <p className="text-gray-400 mb-8 text-sm">Load a course KMZ file to get started.</p>

        <button
          onClick={loadSample}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-semibold py-3 px-4 rounded-xl mb-4 transition-colors"
        >
          {loading ? "Loading..." : "Load Dorchester Ranch Sample"}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-gray-500 text-xs">or</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
        >
          Upload KMZ File
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".kmz"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {error && (
          <div className="mt-4 bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mt-4 bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 text-yellow-300 text-xs">
            <p className="font-semibold mb-1">Warnings:</p>
            <ul className="list-disc list-inside space-y-1">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 text-gray-600 text-xs text-center">
          KMZ naming: H01_TEE_BLUE, H01_GREEN_FRONT, etc.
        </p>
      </div>
    </div>
  );
}
