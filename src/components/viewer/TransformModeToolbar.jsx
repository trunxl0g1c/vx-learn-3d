import MaterialIcon from "../ui/material-icon";

const TRANSFORM_MODES = [
  { id: "translate", label: "Move", icon: "open_with" },
  { id: "rotate", label: "Rotate", icon: "rotate_right" },
  { id: "scale", label: "Scale", icon: "zoom_out_map" },
];

export default function TransformModeToolbar({
  mode = "translate",
  onChange,
  className = "",
}) {
  return (
    <div
      role="toolbar"
      aria-label="Gizmo transform mode"
      className={[
        "pointer-events-auto flex max-w-[calc(100vw-24px)] flex-nowrap items-center gap-1 overflow-hidden rounded-xl border border-accent-main/55 bg-[#111a1a]/95 p-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur-sm max-[767px]:gap-0.5 max-[767px]:rounded-[10px] max-[767px]:p-1",
        className,
      ].join(" ")}
    >
      {TRANSFORM_MODES.map((item) => {
        const active = mode === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChange?.(item.id);
            }}
            className={[
              "cursor-pointer flex h-9 min-w-0 flex-[0_1_auto] items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium transition max-[767px]:px-[9px] max-[420px]:w-12 max-[420px]:flex-none max-[420px]:px-0",
              active
                ? "bg-accent-main text-white/85"
                : "text-contrast-grayout hover:bg-white/10 hover:text-white/85",
            ].join(" ")}
            title={`${item.label} gizmo`}
            aria-pressed={active}
          >
            <MaterialIcon name={item.icon} size={20} />
            <span className="truncate max-[420px]:hidden">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
