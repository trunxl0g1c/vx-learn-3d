import { Bell, ChevronDown } from "lucide-react";

export default function ProjectHubTopbar() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-divider-main bg-[#1b1b1d] px-8">
      <div />

      <div className="flex items-center gap-4">
        <Bell
          size={18}
          className="cursor-pointer text-secondary-default hover:text-white"
        />

        <button className="flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-white/5">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-accent-main text-sm font-semibold text-primary">
            J
          </div>

          <span className="text-sm">Jhon</span>

          <ChevronDown size={16} />
        </button>
      </div>
    </header>
  );
}
