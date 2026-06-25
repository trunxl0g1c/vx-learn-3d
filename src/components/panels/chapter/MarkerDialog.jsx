import { X } from "lucide-react";
import Button from "../../ui/button";

export default function MarkerDialog({
  open,
  value,
  onChange,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] grid place-items-center bg-black/45 backdrop-blur-sm">
      <div className="w-[360px] border border-divider-main bg-primary/95 text-white shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
        <div className="mb-4 py-2 px-4 flex items-center justify-between bg-dark-alpha">
          <h3 className="text-sm font-bold">Marker Dialog</h3>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer grid size-7 place-items-center rounded-md text-secondary-default hover:bg-white/5"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4">
          <label className="mb-2 block text-xs font-semibold text-contrast-grayout">
            Marker Name
          </label>

          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Input marker name"
            className="mb-4 h-10 w-full rounded-lg border border-secondary-default bg-primary/80 px-3 text-sm text-white outline-none"
            autoFocus
          />

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              CANCEL
            </Button>

            <Button variant="gold" className="flex-1" onClick={onSubmit}>
              SUBMIT
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
