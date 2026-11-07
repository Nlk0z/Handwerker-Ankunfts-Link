import type { Status } from "@/lib/auftraege";

const STIL: Record<Status, [string, string]> = {
  geplant: ["Geplant", "bg-stone-100 text-stone-700"],
  unterwegs: ["Unterwegs", "bg-orange-100 text-orange-800"],
  angekommen: ["Vor Ort", "bg-green-100 text-green-800"],
  erledigt: ["Erledigt", "bg-stone-200 text-stone-500"],
  storniert: ["Storniert", "bg-red-50 text-red-700"],
};

export function StatusBadge({ status }: { status: Status }) {
  const [text, cls] = STIL[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>;
}
