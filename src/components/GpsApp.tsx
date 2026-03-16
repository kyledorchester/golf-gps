"use client";

import { useState } from "react";
import type { CourseGpsDataset } from "@/lib/gps-kmz/types";
import CourseLoader from "./CourseLoader";
import GpsView from "./GpsView";

export default function GpsApp() {
  const [dataset, setDataset] = useState<CourseGpsDataset | null>(null);

  if (!dataset) {
    return <CourseLoader onLoad={setDataset} />;
  }

  return <GpsView dataset={dataset} onReset={() => setDataset(null)} />;
}
