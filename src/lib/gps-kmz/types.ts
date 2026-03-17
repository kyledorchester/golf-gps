export interface LatLng {
  lat: number;
  lng: number;
}

export interface HoleGpsData {
  hole: number;
  par?: number;
  tees: Record<string, LatLng>;
  green: {
    front?: LatLng;
    center?: LatLng;
    back?: LatLng;
  };
  extras?: Record<string, unknown>;
}

export interface CourseGpsDataset {
  courseName: string;
  holes: HoleGpsData[];
}

export interface ParseResult {
  success: true;
  dataset: CourseGpsDataset;
  warnings: string[];
}

export interface ParseError {
  success: false;
  error: string;
}

export type KmzParseResult = ParseResult | ParseError;
