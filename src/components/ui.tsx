import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold leading-8 tracking-[-0.02em]">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function MetricCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
      <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold leading-8 tracking-[-0.02em] tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function MetricGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

/** A dashboard tile: the lakehouse's own tile frame. */
export function Tile({
  title,
  subtitle,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-xl border border-border bg-card shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]", className)}>
      <header className="border-b border-border px-3 py-1.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle ? <p className="text-[11px] text-muted-foreground">{subtitle}</p> : null}
      </header>
      <div className={cn("min-w-0 flex-1 p-2", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "good" | "warning" | "serious" | "primary"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium",
        tone === "neutral" && "bg-muted text-muted-foreground",
        tone === "primary" && "bg-primary/15 text-foreground",
        tone === "good" && "bg-[color-mix(in_oklab,var(--status-good)_16%,transparent)] text-foreground",
        tone === "warning" && "bg-[color-mix(in_oklab,var(--status-warning)_18%,transparent)] text-foreground",
        tone === "serious" && "bg-[color-mix(in_oklab,var(--status-serious)_16%,transparent)] text-foreground",
        className,
      )}
    >
      {tone !== "neutral" && tone !== "primary" ? <span className="size-1.5 rounded-full" style={{ background: `var(--status-${tone})` }} /> : null}
      {children}
    </span>
  );
}

export function Button({
  className,
  variant = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" | "ghost" }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/80",
        variant === "outline" && "border border-border bg-background hover:bg-muted",
        variant === "ghost" && "hover:bg-muted",
        className,
      )}
    />
  );
}

export function Notice({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warning" | "serious" }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "neutral" && "border-border bg-muted/40 text-muted-foreground",
        tone === "warning" && "border-[color-mix(in_oklab,var(--status-warning)_45%,transparent)] bg-[color-mix(in_oklab,var(--status-warning)_10%,transparent)]",
        tone === "serious" && "border-[color-mix(in_oklab,var(--status-serious)_45%,transparent)] bg-[color-mix(in_oklab,var(--status-serious)_10%,transparent)]",
      )}
    >
      {children}
    </div>
  );
}

export function DataTable({ columns, rows, className }: { columns: { key: string; label: string; align?: "right" }[]; rows: Record<string, React.ReactNode>[]; className?: string }) {
  return (
    <div className={cn("overflow-auto", className)}>
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-card">
          <tr className="border-b border-border text-left text-muted-foreground">
            {columns.map((c) => (
              <th key={c.key} className={cn("px-2 py-1.5", c.align === "right" && "text-right")}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-border/60 last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-2 py-1.5 align-top", c.align === "right" && "text-right tabular-nums")}>
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The lakehouse dashboard's KPI tile. */
export function Kpi({ label, value, caption, accent }: { label: string; value: React.ReactNode; caption?: React.ReactNode; accent?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        {accent}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums tracking-[-0.02em] text-foreground">{value}</p>
      {caption ? <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{caption}</p> : null}
    </div>
  );
}

/** Marks something the AI produced, the way lakehouse tiles mark Copilot charts. */
export function AiBadge({ children = "AI" }: { children?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-foreground">
      <svg viewBox="0 0 24 24" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </svg>
      {children}
    </span>
  );
}

/** The filter strip above a dashboard's tiles. */
export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card/50 px-3 py-2">{children}</div>;
}

export function FilterPill({ active, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { active?: boolean }) {
  return (
    <a
      {...props}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
        active ? "border-primary/30 bg-primary/10 font-medium text-foreground" : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </a>
  );
}

const STATUS_KEBUTUHAN = {
  terpenuhi: { label: "Terpenuhi", tone: "good" },
  sebagian: { label: "Sebagian", tone: "warning" },
  perlu_dicek: { label: "Perlu dicek", tone: "neutral" },
  belum_ada: { label: "Belum ada", tone: "serious" },
} as const;

export function StatusKebutuhan({ status }: { status: keyof typeof STATUS_KEBUTUHAN }) {
  const s = STATUS_KEBUTUHAN[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/** Share bar: how much of a whole is done. The bar is decoration; the numbers beside it carry the value. */
export function Progress({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)} role="img" aria-label={`${value} dari ${max}`}>
      <div className="h-full rounded-full bg-[var(--brand-1)]" style={{ width: `${pct}%` }} />
    </div>
  );
}
