"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Building2, ClipboardCheck, Database, FileStack, LayoutDashboard, LayoutGrid, ListChecks, MessagesSquare, Moon, Sparkles, Sun, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { TAMPIL_PROSN } from "@/lib/fitur";

type Item = { href: string; label: string; icon: typeof LayoutDashboard; sub?: { href: string; label: string }[] };

const NAV: { label: string; items: Item[] }[] = [
  {
    label: "Dasbor",
    items: [
      { href: "/", label: "Beranda", icon: LayoutGrid },
      {
        href: "/indeks",
        label: "Indeks Pemdi",
        icon: LayoutDashboard,
        sub: [
          { href: "/indeks", label: "Ringkasan" },
          { href: "/indikator", label: "Aspek & Indikator" },
          { href: "/temuan", label: "Temuan Dokumen" },
          { href: "/dashboard-pemdi/pemdi", label: "Telusuri Kerangka" },
        ],
      },
      {
        href: "/dashboard-pemdi/makro",
        label: "Kinerja Daerah",
        icon: TrendingUp,
        sub: [
          { href: "/dashboard-pemdi/makro", label: "Kinerja Makro" },
          { href: "/dashboard-pemdi/spm", label: "Capaian SPM" },
          ...(TAMPIL_PROSN ? [{ href: "/dashboard-pemdi/prosn", label: "Dukungan PROSN" }] : []),
        ],
      },
      { href: "/opd", label: "Kesiapan OPD", icon: Building2 },
      { href: "/data", label: "Data & Aplikasi", icon: Database },
    ],
  },
  {
    label: "Bukti & Penilaian",
    items: [
      { href: "/dokumen", label: "Dokumen", icon: FileStack },
      { href: "/kebutuhan", label: "Kebutuhan Data", icon: ListChecks },
      { href: "/penilaian", label: "Penilaian Indikator", icon: ClipboardCheck },
    ],
  },
  {
    label: "Analisis",
    items: [{ href: "/tanya", label: "AI Tubaba", icon: MessagesSquare }],
  },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  // Who is signed in, from the display cookie the login sets (access is decided by the session cookie, not this).
  const [pengguna, setPengguna] = useState("");
  useEffect(() => {
    const m = /(?:^|; )pemdi_user=([^;]*)/.exec(document.cookie);
    setPengguna(m ? decodeURIComponent(m[1]) : "");
  }, [pathname]);
  const all = NAV.flatMap((g) => g.items);
  // The login page stands alone, without the navigation around it.
  if (pathname === "/login") return <>{children}</>;
  // Whole path segments only: "/" matches itself alone, "/data" does not match "/dashboard-pemdi".
  const cocok = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  // The longest matching href across every item and sub-item wins, so "/dashboard-pemdi/pemdi/..." lands on Indeks Pemdi.
  const kandidat = all.flatMap((i) => [i.href, ...(i.sub ?? []).map((s) => s.href)].filter(cocok).map((h) => ({ item: i, h })));
  const current = kandidat.sort((a, b) => b.h.length - a.h.length)[0]?.item;
  const sub = current?.sub?.filter((s) => cocok(s.href)).sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen print:!hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar shadow-sm md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4">
          <Image src="/tubaba.png" alt="Lambang Kabupaten Tulang Bawang Barat" width={330} height={460} priority className="h-10 w-auto shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">Pemdi-AI</p>
            <p className="truncate text-[11px] text-sidebar-foreground/60">Kab. Tulang Bawang Barat</p>
          </div>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="px-2.5 pb-1.5 text-[11px] font-medium text-sidebar-foreground/50">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = item === current;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-8 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                          active ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60",
                        )}
                      >
                        <item.icon className={cn("size-4", active && "text-sidebar-primary")} />
                        {item.label}
                      </Link>
                      {item.sub && active ? (
                        <ul className="ml-[1.1rem] mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2.5">
                          {item.sub.map((s) => (
                            <li key={s.href}>
                              <Link
                                href={s.href}
                                aria-current={s === sub ? "page" : undefined}
                                className={cn("flex h-7 items-center rounded-md px-2 text-[13px] transition-colors", s === sub ? "font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")}
                              >
                                {s.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-2.5 border-t border-sidebar-border p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/12 text-primary ring-1 ring-primary/20">
            <Sparkles className="size-4 text-sidebar-primary" />
          </span>
          <p className="text-[11px] leading-4 text-sidebar-foreground/60">Permen PANRB 8/2026 · data di RantAI Lakehouse</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col bg-muted/25 print:bg-transparent">
        <header className="sticky top-0 z-20 flex h-16 print:hidden items-center gap-4 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-5">
          <nav className="flex gap-1 overflow-x-auto md:hidden">
            {all.map((item) => (
              <Link key={item.href} href={item.href} title={item.label} className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted", item === current && "bg-muted text-foreground")}>
                <item.icon className="size-4" />
              </Link>
            ))}
          </nav>
          <p className="hidden items-center gap-2 text-sm md:flex">
            <span className="text-muted-foreground">Pemdi-AI</span>
            <span className="text-muted-foreground/50">/</span>
            <span className={sub ? "text-muted-foreground" : "font-medium"}>{current?.label ?? ""}</span>
            {sub ? (
              <>
                <span className="text-muted-foreground/50">/</span>
                <span className="font-medium">{sub.label}</span>
              </>
            ) : null}
          </p>
          <div className="flex-1" />
          <Link href="/dokumen" className="hidden h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 sm:inline-flex">
            <FileStack className="size-4" /> Unggah dokumen
          </Link>
          {pengguna ? <span className="hidden max-w-40 truncate text-sm text-muted-foreground sm:block" title={pengguna}>{pengguna}</span> : null}
          <button
            type="button"
            aria-label="Keluar"
            title="Keluar"
            onClick={() => fetch("/api/logout", { method: "POST" }).finally(() => window.location.assign("/login"))}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <LogOut className="size-4" />
          </button>
          <button type="button" aria-label="Ganti tema" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted">
            <Sun className="hidden size-4 dark:block" />
            <Moon className="size-4 dark:hidden" />
          </button>
        </header>
        <main className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
