export function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-accent-main/60 bg-[#171b1b] p-4">
      <div className="mb-4 flex items-center gap-3">
        <h3 className="text-sm font-normal text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ ready, children }) {
  return (
    <span
      className={[
        "rounded-full border px-2 py-1 text-[10px] font-semibold",
        ready
          ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
          : "border-warning-main/40 bg-warning-main/10 text-warning-main",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
