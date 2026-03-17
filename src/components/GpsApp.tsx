"use client";

import { useState } from "react";
import type { CourseGpsDataset } from "@/lib/gps-kmz/types";
import CourseLoader from "./CourseLoader";
import GpsView from "./GpsView";

interface Props {
  primaryColor?: string;
}

export default function GpsApp({ primaryColor = "#a80602" }: Props) {
  const [dataset, setDataset] = useState<CourseGpsDataset | null>(null);

  if (!dataset) {
    return <CourseLoader onLoad={setDataset} primaryColor={primaryColor} />;
  }

  return <GpsView dataset={dataset} onReset={() => setDataset(null)} primaryColor={primaryColor} />;
}
