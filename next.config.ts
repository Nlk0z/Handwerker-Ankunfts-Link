import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
