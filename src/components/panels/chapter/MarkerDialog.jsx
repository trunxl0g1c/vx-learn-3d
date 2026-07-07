import { X } from "lucide-react";
import Button from "../../ui/button";

export default function MarkerDialog({
  open,
  value,
  onChange,
  onClose,
  onSubmit,
  maxLength = 16,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] grid place-items-center backdrop-blur-sm bg-[#0000007A]">
      <div className="w-[450px] overflow-hidden rounded-[22px] bg-[#1d1e1f] text-white shadow-[0_22px_45px_rgba(0,0,0,0.55)]">
        <div className="flex h-[70px] items-center justify-between bg-dark-alpha px-5">
          <h3 className="text-[21px] font-normal tracking-[-0.2px]">
            Marker Dialog
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="grid size-10 cursor-pointer place-items-center rounded-lg text-[#62c6df] transition hover:bg-white/5"
          >
            <X strokeWidth={2.2} className="size-7" />
          </button>
        </div>

        <div className="px-8 pb-8 pt-7">
          <label className="mb-4 block text-sm font-normal tracking-[0.2px] text-[#9697a8]">
            Instance Name
          </label>

          <div className="relative">
            <input
              value={value}
              maxLength={maxLength}
              onChange={(e) => onChange?.(e.target.value)}
              placeholder="Type instance name here"
              autoFocus
              className="h-[53px] w-full rounded-[10px] border border-[#63c7e5] bg-transparent px-4 pr-16 text-[16px] italic text-white outline-none placeholder:text-[#2d5260] focus:ring-1 focus:ring-[#63c7e5]"
            />

            <span className="pointer-events-none absolute right-[21px] top-1/2 -translate-y-1/2 text-xs font-normal text-[#8f90a1]">
              {value?.length || 0}/{maxLength}
            </span>
          </div>
        </div>

        <div className="border-t border-[#315263] px-6 py-[22px]">
          <div className="flex gap-[14px]">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-[15px] border border-[#bca75c]! bg-transparent text-[19px] font-normal tracking-[4px] text-white hover:bg-white/5"
            >
              CANCEL
            </Button>

            <Button
              variant="gold"
              onClick={onSubmit}
              className="flex-1 rounded-[15px] bg-[#bba75b] text-[19px] font-normal tracking-[4px] text-white hover:bg-[#c6b263]"
            >
              SUBMIT
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
