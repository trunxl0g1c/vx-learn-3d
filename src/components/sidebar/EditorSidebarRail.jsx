import { useNavigate } from "react-router-dom";
import MaterialIcon from "../../components/ui/material-icon";

const sidebarItems = [
  {
    id: "settings",
    icon: "video_settings",
    label: "Project Settings",
    target: "settings",
  },
  {
    id: "visual",
    icon: "sunny_snowing",
    label: "Visual",
    target: "visual",
  },
  {
    id: "hierarchy",
    icon: "package_2",
    label: "Object Hierarchy",
    target: "hierarchy",
  },
  {
    id: "chapters",
    icon: "library_books",
    label: "Object Chapters",
    target: "chapters",
  },
  {
    id: "animation",
    icon: "animation",
    label: "Object Animation",
    target: "animation",
  },
];

export default function EditorSidebarRail({ activeSidebar, setActiveSidebar }) {
  const navigate = useNavigate();

  return (
    <aside className="absolute left-0 top-[56px] bottom-0 z-[120] w-[60px] border-r border-divider-main bg-primary">
      <div className="flex flex-col items-center">
        <button
          type="button"
          title="Back"
          onClick={() => navigate("/")}
          className="grid size-14 cursor-pointer place-items-center text-secondary-default transition hover:bg-white/5"
        >
          <MaterialIcon name="arrow_back" fill={1} className="size-7" />
        </button>

        {sidebarItems.map((item) => {
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
              <MaterialIcon
                name={item.icon}
                fill={item.id == "animation" ? 0 : 1}
                className="size-7"
              />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
