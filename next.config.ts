import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Kein Next.js-Entwickler-Knopf unten links (stört in der iPhone-Vorschau)
  devIndicators: false,
  // PGlite (eingebaute Demo-Datenbank) bringt WASM-Dateien mit und darf nicht gebündelt werden.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingIncludes: {
    "/**": ["./db/schema.sql"],
  },
  // Die Vorschau-Seite nie zwischenspeichern, sonst zeigt der Browser nach Updates die alte Version.
  async headers() {
    const keinCache = [{ key: "Cache-Control", value: "no-store" }];
    return [
      { source: "/iphone", headers: keinCache },
      { source: "/iphone.html", headers: keinCache },
    ];
  },
  // iPhone-Vorschau für den PC: http://localhost:3000/iphone
  async rewrites() {
    return [{ source: "/iphone", destination: "/iphone.html" }];
  },
};

export default nextConfig;
