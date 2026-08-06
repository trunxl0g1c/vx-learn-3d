import { useState } from "react";
import MaterialIcon from "../../ui/material-icon";
import FlowEditorPanel from "./FlowEditorPanel";
import ProceduralEditorPanel from "./ProceduralEditorPanel";

const PRO_TOOLS = [
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
];

export default function ProToolsPanel({ flow, procedural, selectedObjectName, animations = [] }) {
  const [activeTool, setActiveTool] = useState(null);

  if (activeTool === "flow") {
    return (
      <FlowEditorPanel
        flow={flow}
        selectedObjectName={selectedObjectName}
        onBack={() => setActiveTool(null)}
      />
    );
  }

  if (activeTool === "procedural") {
    return (
      <ProceduralEditorPanel
        procedural={procedural}
        selectedObjectName={selectedObjectName}
        animations={animations}
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
            {PRO_TOOLS.map((tool) => {
              const active = activeTool === tool.id;

              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    if (tool.id === "flow") {
                      flow?.beginAuthoring?.();
                      procedural?.stopAuthoring?.();
                    } else if (tool.id === "procedural") {
                      flow?.stopAuthoring?.();
                      procedural?.beginAuthoring?.();
                    } else {
                      flow?.stopAuthoring?.();
                      procedural?.stopAuthoring?.();
                    }
                    setActiveTool(tool.id);
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
