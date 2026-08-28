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
    id: "slides",
    icon: "menu_book",
    label: "Slide",
    target: "slides",
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

  const proActive = activeSidebar === "pro";

  return (
    <aside className="vx-editor-rail absolute left-0 top-[56px] bottom-0 z-[120] w-[60px] border-r border-divider-main bg-primary">
      <div className="flex h-full flex-col items-center">
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
                    : "border-transparent bg-[#1D1D20] text-secondary-default hover:bg-white/5",
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

        <button
          type="button"
          title="Pro"
          onClick={() => setActiveSidebar(proActive ? null : "pro")}
          className={[
            "mb-2 mt-auto grid size-14 cursor-pointer place-items-center border transition",
            proActive
              ? "border-accent-main bg-accent-main text-white"
              : "border-transparent bg-transparent text-secondary-default hover:bg-white/5",
          ].join(" ")}
        >
          <MaterialIcon name="workspace_premium" fill className="size-7" />
        </button>
      </div>
    </aside>
  );
}
