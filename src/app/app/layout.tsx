import Link from "next/link";
import { nutzerOderLogin } from "@/lib/auth";
import { istDemo } from "@/lib/db";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const nutzer = await nutzerOderLogin();
  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-white/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <Link href="/app" className="flex items-center gap-2">
          <Logo className="h-8 w-8" />
          <div className="leading-tight">
            <div className="font-bold">{nutzer.betrieb_name}</div>
            <div className="text-xs text-stone-500">{nutzer.name}</div>
          </div>
        </Link>
        <Link href="/app/einstellungen" className="rounded-full p-2 text-stone-600 active:bg-stone-100" aria-label="Einstellungen">
          <Icon name="zahnrad" className="h-6 w-6" />
        </Link>
      </header>
      {istDemo() && (
        <div className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900">
          Demo-Modus – SMS werden nur angezeigt
        </div>
      )}
      <main className="px-4 py-4 pb-24">{children}</main>
    </div>
  );
}
