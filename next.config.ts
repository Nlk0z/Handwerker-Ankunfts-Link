import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "npm run check" baut nach .next-pruef, damit ein laufender Dev-Server (.next) nicht gestört wird
  distDir: process.env.PRUEF_BUILD ? ".next-pruef" : ".next",
  // Der Prüf-Build bekommt eine eigene tsconfig, damit Next die normale nicht umschreibt
  typescript: { tsconfigPath: process.env.PRUEF_BUILD ? "tsconfig.pruef.json" : "tsconfig.json" },
  // Das runde "N" von Next (nur beim Entwickeln) verdeckt sonst Knöpfe unten links
  devIndicators: false,
  // PGlite (eingebaute Demo-Datenbank) bringt WASM-Dateien mit und darf nicht gebündelt werden.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingIncludes: {
    "/**": ["./db/schema.sql"],
  },
  // iPhone-Vorschau für den PC: http://localhost:3000/iphone
  async rewrites() {
    return [{ source: "/iphone", destination: "/iphone.html" }];
  },
};

export default nextConfig;
