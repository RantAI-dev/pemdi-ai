"use client";

import * as React from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function Page() {
  const [nama, setNama] = React.useState("");
  const [sandi, setSandi] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nama, sandi }) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Gagal masuk.");
      // Only a path on this site is followed, never an absolute URL from the query string.
      const ke = new URLSearchParams(window.location.search).get("ke") ?? "/";
      window.location.assign(ke.startsWith("/") && !ke.startsWith("//") ? ke : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal masuk.");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-muted/25 p-4">
      <form onSubmit={masuk} className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3">
          <Image src="/tubaba.png" alt="Lambang Kabupaten Tulang Bawang Barat" width={330} height={460} priority className="h-12 w-auto" />
          <div>
            <h1 className="text-lg font-semibold leading-6 tracking-[-0.01em]">Pemdi-AI</h1>
            <p className="text-xs text-muted-foreground">Kabupaten Tulang Bawang Barat</p>
          </div>
        </div>
        <label className="mt-6 block text-xs font-medium text-muted-foreground">
          Nama pengguna
          <input
            autoFocus
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring"
          />
        </label>
        <label className="mt-3 block text-xs font-medium text-muted-foreground">
          Kata sandi
          <input
            type="password"
            autoComplete="current-password"
            value={sandi}
            onChange={(e) => setSandi(e.target.value)}
            className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring"
          />
        </label>
        {error ? <p role="alert" className="mt-2 text-sm text-[color:var(--status-serious)]">{error}</p> : null}
        <button type="submit" disabled={busy || !nama.trim() || !sandi} className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50">
          {busy ? <Loader2 className="size-4 animate-spin" /> : null} Masuk
        </button>
        <p className="mt-4 text-[11px] leading-4 text-muted-foreground">Dasbor Pemerintah Digital berbasis Permen PANRB 8/2026. Akses terbatas untuk tim Pemkab dan pendamping.</p>
      </form>
    </div>
  );
}
