"use client";

import { useEffect, useRef } from "react";
import type { LatLng } from "@/lib/gps-kmz/types";

interface Props {
  userPosition: LatLng | null;
  teePosition: LatLng | null;
  greenFront: LatLng | null;
  greenCenter: LatLng | null;
  greenBack: LatLng | null;
  holeName: string;
}

export default function HoleMap({
  userPosition,
  teePosition,
  greenFront,
  greenCenter,
  greenBack,
  holeName,
}: Props) {
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const containerId = "hole-map-container";

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      const L = (await import("leaflet")).default;

      // Fix default marker icon paths in Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!isMounted) return;

      const container = document.getElementById(containerId);
      if (!container) return;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(container, { zoomControl: true, attributionControl: false });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "OpenStreetMap contributors",
        maxZoom: 20,
      }).addTo(map);

      const points: import("leaflet").LatLng[] = [];

      function addPin(pos: LatLng, color: string, label: string) {
        const icon = L.divIcon({
          html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;" title="${label}"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
          className: "",
        });
        const ll = L.latLng(pos.lat, pos.lng);
        L.marker(ll, { icon }).addTo(map).bindPopup(label);
        points.push(ll);
      }

      if (teePosition) addPin(teePosition, "#3b82f6", "Tee");
      if (greenFront) addPin(greenFront, "#22c55e", "Front");
      if (greenCenter) addPin(greenCenter, "#16a34a", "Center");
      if (greenBack) addPin(greenBack, "#15803d", "Back");
      if (userPosition) addPin(userPosition, "#ef4444", "You");

      if (points.length > 0) {
        map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 18 });
      } else {
        map.setView([51.5, -113.5], 14);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [userPosition, teePosition, greenFront, greenCenter, greenBack, holeName]);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <div id={containerId} className="w-full h-full" />
    </>
  );
}
