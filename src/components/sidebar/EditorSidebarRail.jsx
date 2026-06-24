import { ArrowLeft, Box, CloudHail, Pencil, SquarePlay } from "lucide-react";

const sidebarItems = [
  {
    id: "settings",
    icon: SquarePlay,
    label: "Project Settings",
    target: "settings",
  },
  { id: "visual", icon: CloudHail, label: "Visual", target: "visual" },
  {
    id: "hierarchy",
    icon: Box,
    label: "Object Hierarchy",
    target: "hierarchy",
  },
  { id: "annotation", icon: Pencil, label: "Annotation", target: "annotation" },
];

export default function EditorSidebarRail({ activeSidebar, setActiveSidebar }) {
  return (
    <aside className="absolute left-0 top-[60px] bottom-0 z-[120] w-[60px] border-r border-divider-main bg-primary">
      <div className="flex flex-col items-center">
        <button
          type="button"
          title="Back"
          className="grid size-14 place-items-center text-secondary-default transition hover:bg-white/5"
        >
          <ArrowLeft className="size-7" />
        </button>

        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const active = activeSidebar === item.target;

          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => setActiveSidebar(active ? null : item.target)}
              className={[
                "grid size-14 cursor-pointer place-items-center border transition",
                active
                  ? "border-accent-main bg-accent-main text-white"
                  : "border-transparent bg-transparent text-secondary-default hover:bg-white/5",
              ].join(" ")}
            >
              <Icon className="size-7" />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
