"use client";

import * as React from "react";

/**
 * Shown when a page fails in the browser. The usual cause is a tab left open
 * across a deploy: it asks for script files of the previous version, which no
 * longer exist. That case reloads itself once; anything else offers the
 * reload and shows the message.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const usang = /ChunkLoadError|Loading chunk|Failed to load chunk|Failed to fetch dynamically imported module/i.test(`${error.name} ${error.message}`);
  React.useEffect(() => {
    if (!usang) return;
    const key = "pemdi-muat-ulang";
    // Once per tab per minute, so a genuinely broken page cannot reload in a loop.
    if (Date.now() - Number(sessionStorage.getItem(key) ?? 0) > 60_000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  }, [usang]);

  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-border bg-card p-6 text-center">
      <h2 className="text-lg font-semibold">{usang ? "Aplikasi baru saja diperbarui" : "Halaman ini gagal dimuat"}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {usang ? "Tab ini masih memakai versi lama. Muat ulang untuk melanjutkan." : "Terjadi kesalahan saat menampilkan halaman. Coba muat ulang; bila berulang, sampaikan pesan di bawah ke pengelola."}
      </p>
      {!usang ? <p className="mt-3 break-words rounded-lg bg-muted/50 p-2 font-mono text-xs text-muted-foreground">{error.message || error.digest || "Tanpa pesan"}</p> : null}
      <div className="mt-4 flex justify-center gap-2">
        <button type="button" onClick={() => window.location.reload()} className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">
          Muat ulang
        </button>
        {!usang ? (
          <button type="button" onClick={reset} className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted">
            Coba lagi
          </button>
        ) : null}
      </div>
    </div>
  );
}
