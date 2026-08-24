import Switch from "../../ui/switch";
import { normalizeProToolsSettings } from "../../../engine/project/ProToolsSettings";

const PRO_TOOL_OPTIONS = [
  {
    key: "addMoreGlb",
    label: "Add More GLB",
    description: "Allow this project to load and use additional GLB models.",
  },
  {
    key: "flow",
    label: "Flow",
    description: "Show Flow authoring in the Pro menu.",
  },
  {
    key: "procedure",
    label: "Procedure",
    description: "Show guided and assembly Procedure authoring.",
  },
  {
    key: "animationCreation",
    label: "Animation Creation",
    description: "Show custom animation authoring.",
  },
  {
    key: "quiz",
    label: "Quiz",
    description: "Show Quiz and assessment authoring.",
  },
  {
    key: "xrImmersive",
    label: "XR / Immersive",
    description: "Show VR and AR immersive authoring.",
  },
];

export default function ProToolsSettingsControls({ settings, onChange, embedded = false }) {
  const normalized = normalizeProToolsSettings(settings);

  return (
    <div className={embedded ? "" : "rounded-xl border border-secondary-default bg-primary p-4"}>
      {!embedded && (
        <div className="mb-2 text-sm font-normal text-white">Pro Tools</div>
      )}
      <p className="mb-4 text-xs leading-5 text-contrast-grayout">
        Choose which authoring tools are available in the Pro menu for this
        project.
      </p>

      <div className="space-y-4">
        {PRO_TOOL_OPTIONS.map((option, index) => (
          <div
            key={option.key}
            className={[
              "flex items-center justify-between gap-4",
              index > 0 ? "border-t border-white/10 pt-4" : "",
            ].join(" ")}
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-normal text-white">{option.label}</div>
              <p className="mt-1 text-xs leading-4 text-contrast-grayout">
                {option.description}
              </p>
            </div>

            <Switch
              checked={normalized[option.key]}
              onCheckedChange={(checked) =>
                onChange?.({
                  ...normalized,
                  [option.key]: checked,
                })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
