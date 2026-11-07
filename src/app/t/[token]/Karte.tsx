"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Kleine Karte mit dem Standort des Monteurs (OpenStreetMap). */
export default function Karte({ lat, lng }: { lat: number; lng: number }) {
  const element = useRef<HTMLDivElement>(null);
  const karte = useRef<L.Map | null>(null);
  const punkt = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!element.current || karte.current) return;
    karte.current = L.map(element.current, { zoomControl: false, attributionControl: true }).setView([lat, lng], 14);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(karte.current);
    const icon = L.divIcon({
      className: "",
      html: '<div style="width:22px;height:22px;border-radius:9999px;background:#e8590c;border:4px solid white;box-shadow:0 0 0 2px #e8590c55,0 2px 6px #0004"></div>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    punkt.current = L.marker([lat, lng], { icon }).addTo(karte.current);
    return () => { karte.current?.remove(); karte.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    punkt.current?.setLatLng([lat, lng]);
    karte.current?.panTo([lat, lng]);
  }, [lat, lng]);

  return <div ref={element} className="relative z-0 h-56 overflow-hidden rounded-2xl ring-1 ring-stone-200" />;
}
