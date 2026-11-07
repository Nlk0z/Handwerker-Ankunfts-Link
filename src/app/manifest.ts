import type { MetadataRoute } from "next";

// Macht die Web-App auf dem Handy "installierbar" (Zum Home-Bildschirm hinzufügen).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kommt gleich – Handwerker",
    short_name: "Kommt gleich",
    start_url: "/app",
    display: "standalone",
    background_color: "#f5f5f4",
    theme_color: "#e8590c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
