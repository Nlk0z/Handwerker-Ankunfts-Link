// Wird von "npm run check" benutzt: baut in einen eigenen Ordner (.next-pruef),
// damit ein laufendes "npm run dev" (nutzt .next) dabei nicht kaputtgeht.
import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["next", "build"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, PRUEF_BUILD: "1" },
});
process.exit(r.status ?? 1);
