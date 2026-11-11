import { Icon } from "./Icon";

/** Anzeige von 1–5 Sternen (nur lesen). */
export function Sterne({ anzahl, className = "h-4 w-4" }: { anzahl: number; className?: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${anzahl} von 5 Sternen`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= anzahl ? "text-amber-500 [&_path]:fill-current" : "text-stone-300"}>
          <Icon name="stern" className={className} />
        </span>
      ))}
    </span>
  );
}
