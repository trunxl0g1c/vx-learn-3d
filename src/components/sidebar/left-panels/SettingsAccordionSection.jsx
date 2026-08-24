import { ChevronDown } from "lucide-react";
import { useState } from "react";

export default function SettingsAccordionSection({
  title,
  description = "",
  icon = null,
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));

  return (
    <section className="overflow-hidden rounded-xl border border-secondary-default bg-primary">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-secondary-default"
      >
        {icon ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-secondary-default/40 bg-secondary-default/10 text-secondary-default">
            {icon}
          </span>
        ) : null}

        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-white">{title}</span>
          {description ? (
            <span className="mt-1 block text-xs leading-5 text-contrast-grayout">
              {description}
            </span>
          ) : null}
        </span>

        <ChevronDown
          className={[
            "size-4 shrink-0 text-secondary-default transition-transform duration-200",
            open ? "rotate-180" : "rotate-0",
          ].join(" ")}
        />
      </button>

      {open ? (
        <div className="border-t border-white/10 px-4 pb-4 pt-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}
