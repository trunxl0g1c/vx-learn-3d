import { useState } from "react";
import { Minus, Plus } from "lucide-react";

export default function Collapsible({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-divider-main">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-16 w-full items-center justify-between bg-dark-alpha px-6 text-left"
      >
        <span className="text-base font-semibold text-white">{title}</span>

        {open ? (
          <Minus className="size-5 text-secondary-default" />
        ) : (
          <Plus className="size-5 text-secondary-default" />
        )}
      </button>

      {open && <div className="p-4">{children}</div>}
    </div>
  );
}
