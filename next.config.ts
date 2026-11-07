import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (eingebaute Demo-Datenbank) bringt WASM-Dateien mit und darf nicht gebündelt werden.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingIncludes: {
    "/**": ["./db/schema.sql"],
  },
};

export default nextConfig;
