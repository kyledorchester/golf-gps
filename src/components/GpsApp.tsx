"use client";

import { useState, useEffect } from "react";
import type { CourseGpsDataset } from "@/lib/gps-kmz/types";
import CourseLoader from "./CourseLoader";
import GpsView from "./GpsView";

const STORAGE_KEY = "golf-gps-last-course";

interface Props {
  primaryColor?: string;
}

export default function GpsApp({ primaryColor = "#a80602" }: Props) {
  const [dataset, setDataset] = useState<CourseGpsDataset | null>(null);
  const [ready, setReady] = useState(false);

  // Restore last course from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setDataset(JSON.parse(saved));
    } catch {
      // ignore corrupt data
    }
    setReady(true);
  }, []);

  function handleLoad(d: CourseGpsDataset) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    } catch {
      // Serialization or storage quota failed — clear corrupt entry
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }
    setDataset(d);
  }

  function handleReset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setDataset(null);
  }

  // Avoid flash of CourseLoader before localStorage check completes
  if (!ready) return <div className="min-h-screen" style={{ background: "#1a1a1a" }} suppressHydrationWarning />;

  if (!dataset) {
    return <CourseLoader onLoad={handleLoad} primaryColor={primaryColor} />;
  }

  return <GpsView dataset={dataset} onReset={handleReset} primaryColor={primaryColor} />;
}
