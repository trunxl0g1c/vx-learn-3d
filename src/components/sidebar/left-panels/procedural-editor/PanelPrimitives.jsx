export function Section({ title, step, children }) {
  return (
    <section className="rounded-xl border border-secondary-default/60 bg-[#171b1b] p-4">
      <div className="mb-4 flex items-center gap-3">
        {step && (
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-main text-xs font-bold text-white">
            {step}
          </span>
        )}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ ready, children }) {
  return (
    <span
      className={[
        "rounded-full border px-2 py-1 text-[10px]",
        ready
          ? "border-green-400/40 bg-green-500/10 text-green-200"
          : "border-warning-main/40 bg-warning-main/10 text-warning-main",
      ].join(" ")}
    >
      {children}
    </span>
  );
}
