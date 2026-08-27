import { useState } from "react";
import MaterialIcon from "../../ui/material-icon";
import FlowEditorPanel from "./FlowEditorPanel";
import ProceduralEditorPanel from "./ProceduralEditorPanel";
import AddMoreGlbPanel from "./AddMoreGlbPanel";
import { isProToolEnabled } from "../../../engine/project/ProToolsSettings";
import { useLicenseInfo } from "../../../modules/license/api/license";

const PRO_TOOLS = [
  {
    id: "add-more-glb",
    label: "Add More GLB",
    description: "Load more GLB models into the current project scene.",
    icon: "deployed_code",
  },
  {
    id: "flow",
    label: "Flow",
    description: "Create interactive object and learning flows.",
    icon: "account_tree",
  },
  {
    id: "procedural",
    label: "Procedure",
    description: "Build guided and assembly training.",
    icon: "schema",
  },
  {
    id: "animation-creation",
    label: "Animation Creation",
    description: "Author custom object animation sequences.",
    icon: "animation",
  },
  {
    id: "quiz",
    label: "Quiz",
    description: "Create LMS and interactive 3D assessments.",
    icon: "quiz",
  },
  {
    id: "xr",
    label: "XR / Immersive",
    description: "Configure VR and AR player experiences.",
    icon: "view_in_ar",
  },
];

export default function ProToolsPanel({
  proToolsSettings,
  flow,
  procedural,
  animationAuthoring,
  quizAuthoring,
  xrAuthoring,
  selectedObjectName,
  animations = [],
  additionalModels = [],
  onAddAdditionalGlbFiles,
  onRemoveAdditionalGlb,
}) {
  const [activeTool, setActiveTool] = useState(null);
  const { data: licenseInfo } = useLicenseInfo();
  const licenseFlowEnabled = licenseInfo?.features?.feature_flow === true;
  const visibleTools = PRO_TOOLS.filter((tool) =>
    isProToolEnabled(proToolsSettings, tool.id, licenseFlowEnabled),
  );

  if (
    activeTool === "add-more-glb" &&
    isProToolEnabled(proToolsSettings, "add-more-glb", licenseFlowEnabled)
  ) {
    return (
      <AddMoreGlbPanel
        models={additionalModels}
        onAddFiles={onAddAdditionalGlbFiles}
        onRemoveModel={onRemoveAdditionalGlb}
        onBack={() => setActiveTool(null)}
      />
    );
  }

  if (
    activeTool === "flow" &&
    isProToolEnabled(proToolsSettings, "flow", licenseFlowEnabled)
  ) {
    return (
      <FlowEditorPanel
        flow={flow}
        selectedObjectName={selectedObjectName}
        onBack={() => setActiveTool(null)}
      />
    );
  }

  if (
    activeTool === "procedural" &&
    isProToolEnabled(proToolsSettings, "procedural", licenseFlowEnabled)
  ) {
    return (
      <ProceduralEditorPanel
        procedural={procedural}
        selectedObjectName={selectedObjectName}
        animations={animations}
        authoredAnimations={animationAuthoring?.animations || []}
        onBack={() => setActiveTool(null)}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="sticky top-0 z-10 flex h-16 shrink-0 items-center bg-[#14201f] px-4 text-lg font-normal">
        Pro
      </div>

      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-4">
        <div className="rounded-xl border border-accent-main/70 bg-[#171b1b] p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl border border-accent-main/50 bg-accent-main/10 text-accent-main">
              <MaterialIcon name="workspace_premium" fill className="size-6" />
            </div>
            <div>
              <p className="text-sm font-normal text-white">Pro Tools</p>
              <p className="text-xs text-contrast-grayout">
                Advanced authoring workspace
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {visibleTools.map((tool) => {
              const active = activeTool === tool.id;

              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    flow?.stopAuthoring?.();
                    procedural?.stopAuthoring?.();
                    animationAuthoring?.stopAuthoring?.();
                    quizAuthoring?.stopAuthoring?.();
                    xrAuthoring?.stopAuthoring?.();

                    if (tool.id === "flow") flow?.beginAuthoring?.();
                    if (tool.id === "procedural") procedural?.beginAuthoring?.();
                    if (tool.id === "animation-creation") {
                      animationAuthoring?.beginAuthoring?.();
                    }
                    if (tool.id === "quiz") quizAuthoring?.beginAuthoring?.();
                    if (tool.id === "xr") xrAuthoring?.beginAuthoring?.();

                    setActiveTool(
                      ["animation-creation", "quiz", "xr"].includes(tool.id)
                        ? null
                        : tool.id,
                    );
                  }}
                  className={[
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                    active
                      ? "border-accent-main bg-accent-main/15"
                      : "border-accent-main/50 bg-primary/40 hover:border-accent-main hover:bg-white/5",
                  ].join(" ")}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-accent-main/50 text-accent-main">
                    <MaterialIcon
                      name={tool.icon}
                      fill={tool.id === "animation-creation" ? 0 : 1}
                      className="size-6"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-normal text-white">
                      {tool.label}
                    </span>
                    <span className="mt-1 block text-xs leading-4 text-contrast-grayout">
                      {tool.description}
                    </span>
                  </span>

                  <MaterialIcon
                    name="arrow_forward_ios"
                    className="size-4 shrink-0 text-accent-main"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
