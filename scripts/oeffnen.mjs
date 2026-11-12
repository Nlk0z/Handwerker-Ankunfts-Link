// npm run iphone
// Startet die App (falls sie noch nicht läuft) und öffnet die iPhone-Vorschau im Browser.
import { spawn } from "node:child_process";

const PORT = process.env.PORT ?? "3000";
const URL_VORSCHAU = `http://localhost:${PORT}/iphone`;

const laeuft = async () => {
  try {
    return (await fetch(URL_VORSCHAU, { signal: AbortSignal.timeout(2000) })).ok;
  } catch {
    return false;
  }
};

function browserOeffnen() {
  const [cmd, args] =
    process.platform === "win32" ? ["cmd", ["/c", "start", "", URL_VORSCHAU]]
    : process.platform === "darwin" ? ["open", [URL_VORSCHAU]]
    : ["xdg-open", [URL_VORSCHAU]];
  spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
  console.log(`📱 iPhone-Vorschau: ${URL_VORSCHAU}`);
}

if (await laeuft()) {
  browserOeffnen();
} else {
  console.log("Starte die App …");
  const server = spawn("npx", ["next", "dev", "-p", PORT], { stdio: "inherit", shell: true });
  // Strg+C: Server mit allen Unterprozessen beenden. Unter Windows reicht server.kill() nicht
  // (beendet nur die Shell, "next dev" liefe im Hintergrund mit altem Stand weiter).
  process.on("SIGINT", () => {
    if (process.platform === "win32") spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
    else server.kill();
    process.exit(0);
  });
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    if (await laeuft()) {
      browserOeffnen();
      break;
    }
  }
}
