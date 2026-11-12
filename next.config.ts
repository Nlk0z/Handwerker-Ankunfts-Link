import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "npm run check" baut nach .next-pruef, damit ein laufender Dev-Server (.next) nicht gestört wird
  distDir: process.env.PRUEF_BUILD ? ".next-pruef" : ".next",
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
