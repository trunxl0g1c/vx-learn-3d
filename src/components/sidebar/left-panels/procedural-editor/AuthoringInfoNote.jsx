import { useEffect, useRef, useState } from "react";
import MaterialIcon from "../../../ui/material-icon";

export default function AuthoringInfoNote({ text, title = "Information", className = "" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  if (!text) return null;

  return (
    <span ref={rootRef} className={["relative inline-flex shrink-0", className].join(" ")}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="grid size-5 place-items-center rounded-full border border-secondary-default/55 text-secondary-default transition hover:bg-secondary-default/10 hover:text-white"
        title={title}
        aria-label={title}
        aria-expanded={open}
      >
        <MaterialIcon name="info" fill={1} className="size-3.5" />
      </button>

      {open && (
        <span
          role="note"
          className="absolute right-0 top-7 z-[260] w-64 rounded-sm border border-amber-700/30 bg-amber-100 p-3 text-left text-[10px] font-medium leading-4 text-amber-950 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <span className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-amber-900/70">
            <MaterialIcon name="sticky_note_2" fill={1} className="size-3.5" />
            {title}
          </span>
          {text}
        </span>
      )}
    </span>
  );
}
