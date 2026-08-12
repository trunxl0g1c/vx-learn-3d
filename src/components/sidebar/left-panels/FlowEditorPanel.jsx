import MaterialIcon from "../../ui/material-icon";
import Button from "../../ui/button";
import Switch from "../../ui/switch";
import {
  FLOW_EFFECT_OPTIONS,
  FLOW_OCCLUSION_MODES,
  FLOW_OCCLUSION_OPTIONS,
  getFlowEffectDefaultColor,
  getFlowEffectOption,
  getFlowOcclusionOption,
} from "../../../engine/flow";

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.5, 2, 3];

function Section({ title, step, children }) {
  return (
    <section className="rounded-xl border border-secondary-default/60 bg-[#171b1b] p-4">
      <div className="mb-4 flex items-center gap-3">
        {step && (
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-main text-xs font-bold text-white">
            {step}
          </span>
        )}
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function SmallToolButton({ icon, children, ...props }) {
  return (
    <Button
      type="button"
      size="xs"
      variant="darkOutline"
      className="min-w-0 flex-1 px-2"
      {...props}
    >
      <MaterialIcon name={icon} className="size-4" />
      <span className="truncate">{children}</span>
    </Button>
  );
}

export default function FlowEditorPanel({ flow, onBack, selectedObjectName }) {
  const activeFlow = flow?.activeFlow;
  const hasEnoughPoints = (activeFlow?.points?.length || 0) >= 2;
  const selectedPointIds = Array.isArray(flow?.selectedPointIds)
    ? flow.selectedPointIds
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex h-16 shrink-0 items-center gap-2 bg-[#14201f] px-3 pr-14">
        <button
          type="button"
          onClick={() => {
            flow?.stopAuthoring?.();
            onBack?.();
          }}
          className="grid size-9 place-items-center rounded-lg text-secondary-default hover:bg-white/10"
          title="Back to Pro Tools"
        >
          <MaterialIcon name="arrow_back" className="size-6" />
        </button>
        <div>
          <p className="text-base font-semibold text-white">Flow Authoring</p>
          <p className="text-[11px] text-contrast-grayout">
            Create reusable visual flow material
          </p>
        </div>
      </div>

      <div className="sidebar-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <Section title="Create or Select Flow" step="1">
          <div className="flex gap-2">
            <select
              value={flow?.activeFlowId || ""}
              onChange={(event) => {
                const nextFlowId = event.target.value || null;

                if (flow?.selectFlow) {
                  flow.selectFlow(nextFlowId);
                  return;
                }

                // Backward-compatible fallback for older manager shapes.
                flow?.setPointMode?.(false);
                flow?.setActiveFlowId?.(nextFlowId);
              }}
              className="h-10 min-w-0 flex-1 rounded-lg border border-secondary-default/70 bg-primary px-3 text-sm text-white outline-none"
            >
              <option value="">Select flow</option>
              {(flow?.flows || []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <Button size="sm" onClick={flow?.createFlow}>
              <MaterialIcon name="add" className="size-5" />
              New
            </Button>
          </div>

          {(flow?.flows || []).length === 0 && (
            <p className="mt-3 text-xs leading-5 text-contrast-grayout">
              Create a flow first. Each flow will become one playable flow
              material in Player.
            </p>
          )}
        </Section>

        {flow?.isLoadingActiveFlow && (
          <div className="rounded-xl border border-divider-main bg-dark-alpha p-4 text-sm text-contrast-grayout">
            Loading Flow details...
          </div>
        )}

        {activeFlow && !flow?.isLoadingActiveFlow && (
          <>
            <Section title="Flow Information" step="2">
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs text-contrast-grayout">
                    Flow Name
                  </span>
                  <input
                    value={activeFlow.name}
                    onChange={(event) =>
                      flow.updateFlow(activeFlow.id, {
                        name: event.target.value,
                      })
                    }
                    className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none focus:border-secondary-default"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs text-contrast-grayout">
                    Description
                  </span>
                  <textarea
                    value={activeFlow.description}
                    onChange={(event) =>
                      flow.updateFlow(activeFlow.id, {
                        description: event.target.value,
                      })
                    }
                    rows={3}
                    className="w-full resize-none rounded-lg border border-secondary-default/60 bg-primary p-3 text-sm text-white outline-none focus:border-secondary-default"
                    placeholder="Explain what this flow represents..."
                  />
                </label>
              </div>
            </Section>

            <Section title="Build Flow Path" step="3">
              <p className="mb-3 text-xs leading-5 text-contrast-grayout">
                Points are connected in order from start to end. Add points by
                clicking the model, from the selected object center, or from
                the current camera target. Click an existing waypoint, then use
                its translate gizmo to move it freely inside or outside a mesh.
              </p>

              <Button
                type="button"
                size="sm"
                variant={flow.pointMode ? "default" : "cyanOutline"}
                className="w-full"
                onClick={flow.togglePointMode}
              >
                <MaterialIcon
                  name={flow.pointMode ? "close" : "add_location_alt"}
                  className="size-5"
                />
                {flow.pointMode
                  ? "Stop Adding Points"
                  : "Add Points on 3D Model"}
              </Button>

              {flow.pointMode && (
                <div className="mt-3 rounded-lg border border-warning-main/50 bg-warning-main/10 p-3 text-xs leading-5 text-secondary-default">
                  Click visible surfaces in the viewport. Every click adds the
                  next point in the route.
                </div>
              )}

              <Button
                type="button"
                size="sm"
                variant={
                  flow.multiplePointEditEnabled ? "default" : "darkOutline"
                }
                className="mt-3 w-full"
                onClick={flow.toggleMultiplePointEdit}
                disabled={activeFlow.points.length === 0}
              >
                <MaterialIcon
                  name={
                    flow.multiplePointEditEnabled ? "group_off" : "select_all"
                  }
                  className="size-5"
                />
                {flow.multiplePointEditEnabled
                  ? "Stop Multiple Waypoint Edit"
                  : "Edit Multiple Waypoint"}
              </Button>

              {flow.multiplePointEditEnabled && (
                <div className="mt-3 rounded-lg border border-secondary-default/50 bg-secondary-default/10 p-3 text-xs leading-5 text-secondary-default">
                  Click several waypoints to select them. The gizmo appears at
                  the selection center and moves every selected waypoint
                  together.
                </div>
              )}

              {selectedPointIds.length > 0 && (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-divider-main bg-primary/60 px-3 py-2">
                  <span className="text-xs text-white">
                    {selectedPointIds.length} waypoint
                    {selectedPointIds.length === 1 ? "" : "s"} selected
                  </span>
                  <button
                    type="button"
                    onClick={flow.clearPointSelection}
                    className="text-[11px] font-semibold text-secondary-default hover:text-white"
                  >
                    Clear selection
                  </button>
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <SmallToolButton
                  icon="center_focus_strong"
                  disabled={!selectedObjectName}
                  onClick={flow.addPointFromSelectedObject}
                  title={
                    selectedObjectName
                      ? `Add center of ${selectedObjectName}`
                      : "Select an object first"
                  }
                >
                  Selected Center
                </SmallToolButton>
                <SmallToolButton
                  icon="my_location"
                  onClick={flow.addPointFromViewTarget}
                >
                  View Target
                </SmallToolButton>
                <SmallToolButton
                  icon="undo"
                  disabled={!activeFlow.points.length}
                  onClick={flow.removeLastPoint}
                >
                  Undo Point
                </SmallToolButton>
                <SmallToolButton
                  icon="swap_vert"
                  disabled={activeFlow.points.length < 2}
                  onClick={flow.reversePoints}
                >
                  Reverse
                </SmallToolButton>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-secondary-default/50">
                {activeFlow.points.length === 0 ? (
                  <div className="p-4 text-center text-xs text-contrast-grayout">
                    No points yet. Add at least two points.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {activeFlow.points.map((point, index) => (
                      <div
                        key={point.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => flow.selectPoint?.(point.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            flow.selectPoint?.(point.id);
                          }
                        }}
                        className={[
                          "flex cursor-pointer items-center gap-3 border-b border-divider-main/70 px-3 py-2 last:border-b-0",
                          selectedPointIds.includes(point.id)
                            ? "bg-secondary-default/15 ring-1 ring-inset ring-secondary-default/60"
                            : "hover:bg-white/5",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white",
                            index === 0
                              ? "bg-green-600"
                              : index === activeFlow.points.length - 1
                                ? "bg-red-500"
                                : "bg-accent-main",
                          ].join(" ")}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white">
                            {index === 0
                              ? "Start Point"
                              : index === activeFlow.points.length - 1
                                ? "End Point"
                                : `Waypoint ${index + 1}`}
                          </p>
                          <p className="truncate text-[10px] text-contrast-grayout">
                            {point.position
                              .map((value) => Number(value).toFixed(2))
                              .join(", ")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            flow.removePoint(point.id);
                          }}
                          className="grid size-8 place-items-center rounded-lg text-contrast-grayout hover:bg-red-500/10 hover:text-red-300"
                          title="Delete point"
                        >
                          <MaterialIcon name="delete" className="size-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {activeFlow.points.length > 0 && (
                <button
                  type="button"
                  onClick={flow.clearPoints}
                  className="mt-3 text-xs text-red-300 hover:text-red-200"
                >
                  Clear all path points
                </button>
              )}
            </Section>

            <Section title="Appearance & Playback" step="4">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-white">
                    Effect Type
                  </span>
                  <select
                    value={activeFlow.settings.effectType}
                    onChange={(event) => {
                      const effectType = event.target.value;
                      flow.updateFlow(activeFlow.id, {
                        settings: {
                          effectType,
                          color: getFlowEffectDefaultColor(effectType),
                        },
                      });
                    }}
                    className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none focus:border-secondary-default"
                  >
                    {FLOW_EFFECT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block text-[10px] leading-4 text-contrast-grayout">
                    {getFlowEffectOption(activeFlow.settings.effectType).description}
                  </span>
                </label>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-white">Color</p>
                    <p className="text-[10px] text-contrast-grayout">
                      Main color of the selected effect
                    </p>
                  </div>
                  <input
                    type="color"
                    value={activeFlow.settings.color}
                    onChange={(event) =>
                      flow.updateFlow(activeFlow.id, {
                        settings: { color: event.target.value },
                      })
                    }
                    className="h-9 w-14 cursor-pointer rounded-lg border border-secondary-default bg-transparent p-1"
                  />
                </div>

                <label className="block">
                  <span className="mb-1.5 flex items-center justify-between text-xs text-white">
                    <span className="font-semibold">Thickness</span>
                    <span className="text-contrast-grayout">
                      {Number(activeFlow.settings.thickness || 1).toFixed(1)}x
                    </span>
                  </span>
                  <input
                    type="range"
                    min="0.4"
                    max="3"
                    step="0.1"
                    value={activeFlow.settings.thickness || 1}
                    onChange={(event) =>
                      flow.updateFlow(activeFlow.id, {
                        settings: { thickness: Number(event.target.value) },
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 flex items-center justify-between text-xs text-white">
                    <span className="font-semibold">Effect Density</span>
                    <span className="text-contrast-grayout">
                      {activeFlow.settings.particleCount}
                    </span>
                  </span>
                  <input
                    type="range"
                    min="4"
                    max="48"
                    step="1"
                    value={activeFlow.settings.particleCount}
                    onChange={(event) =>
                      flow.updateFlow(activeFlow.id, {
                        settings: { particleCount: Number(event.target.value) },
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 flex items-center justify-between text-xs text-white">
                    <span className="font-semibold">Opacity</span>
                    <span className="text-contrast-grayout">
                      {Math.round((activeFlow.settings.opacity || 0.9) * 100)}%
                    </span>
                  </span>
                  <input
                    type="range"
                    min="0.15"
                    max="1"
                    step="0.05"
                    value={activeFlow.settings.opacity || 0.9}
                    onChange={(event) =>
                      flow.updateFlow(activeFlow.id, {
                        settings: { opacity: Number(event.target.value) },
                      })
                    }
                    className="w-full accent-cyan-400"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-white">
                    Behind Object Display
                  </span>
                  <select
                    value={activeFlow.settings.occlusionMode}
                    onChange={(event) =>
                      flow.updateFlow(activeFlow.id, {
                        settings: { occlusionMode: event.target.value },
                      })
                    }
                    className="h-10 w-full rounded-lg border border-secondary-default/60 bg-primary px-3 text-sm text-white outline-none focus:border-secondary-default"
                  >
                    {FLOW_OCCLUSION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block text-[10px] leading-4 text-contrast-grayout">
                    {getFlowOcclusionOption(activeFlow.settings.occlusionMode).description}
                  </span>
                </label>

                {activeFlow.settings.occlusionMode ===
                  FLOW_OCCLUSION_MODES.DEPTH_CUE && (
                  <label className="block">
                    <span className="mb-1.5 flex items-center justify-between text-xs text-white">
                      <span className="font-semibold">Behind Opacity</span>
                      <span className="text-contrast-grayout">
                        {Math.round(
                          (activeFlow.settings.occludedOpacity || 0.28) * 100,
                        )}%
                      </span>
                    </span>
                    <input
                      type="range"
                      min="0.08"
                      max="0.65"
                      step="0.01"
                      value={activeFlow.settings.occludedOpacity || 0.28}
                      onChange={(event) =>
                        flow.updateFlow(activeFlow.id, {
                          settings: {
                            occludedOpacity: Number(event.target.value),
                          },
                        })
                      }
                      className="w-full accent-cyan-400"
                    />
                  </label>
                )}

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-white">Speed</p>
                    <p className="text-[10px] text-contrast-grayout">
                      Model-relative speed for consistent playback across GLBs
                    </p>
                  </div>
                  <select
                    value={activeFlow.settings.speed}
                    onChange={(event) =>
                      flow.updateFlow(activeFlow.id, {
                        settings: { speed: Number(event.target.value) },
                      })
                    }
                    className="h-9 w-24 rounded-lg border border-secondary-default/60 bg-primary px-2 text-xs text-white outline-none"
                  >
                    {SPEED_OPTIONS.map((speed) => (
                      <option key={speed} value={speed}>
                        {speed}x
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-white">Repeat</p>
                    <p className="text-[10px] text-contrast-grayout">
                      Restart automatically after reaching the end
                    </p>
                  </div>
                  <Switch
                    checked={activeFlow.settings.repeat}
                    onCheckedChange={(checked) =>
                      flow.updateFlow(activeFlow.id, {
                        settings: { repeat: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-white">Show Guide</p>
                    <p className="text-[10px] text-contrast-grayout">
                      Display a thin reference path behind the effect
                    </p>
                  </div>
                  <Switch
                    checked={activeFlow.settings.showGuide}
                    onCheckedChange={(checked) =>
                      flow.updateFlow(activeFlow.id, {
                        settings: { showGuide: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-white">
                      Show Waypoints
                    </p>
                    <p className="text-[10px] text-contrast-grayout">
                      Display start, waypoint, and end markers in the final flow
                    </p>
                  </div>
                  <Switch
                    checked={activeFlow.settings.showWaypoints === true}
                    onCheckedChange={(checked) =>
                      flow.updateFlow(activeFlow.id, {
                        settings: { showWaypoints: checked },
                      })
                    }
                  />
                </div>
              </div>
            </Section>

            <Section title="Preview & Save" step="5">
              <p className="mb-3 text-xs leading-5 text-contrast-grayout">
                Changes are saved automatically into the project. Save the
                current visual state and camera so Player applies the same view
                before flow playback starts.
              </p>

              <Button
                type="button"
                size="sm"
                className="mb-3 w-full"
                variant={
                  activeFlow.visualState && activeFlow.cameraView
                    ? "default"
                    : "cyanOutline"
                }
                onClick={flow.saveViewState}
                title="Save the current camera together with visibility, X-Ray, Pull Apart, Cut, and selection"
              >
                <MaterialIcon name="save" className="size-5" />
                {activeFlow.visualState && activeFlow.cameraView
                  ? "Update Camera + State"
                  : "Save Camera + State"}
              </Button>

              <div className="mb-3 rounded-lg border border-secondary-default/30 bg-primary/50 px-3 py-2 text-[10px] text-contrast-grayout">
                Camera + State:{" "}
                {activeFlow.visualState && activeFlow.cameraView
                  ? "Saved"
                  : activeFlow.visualState || activeFlow.cameraView
                    ? "Partially saved — save again to synchronize"
                    : "Not saved"}
              </div>

              <Button
                type="button"
                size="sm"
                className="w-full"
                disabled={!hasEnoughPoints}
                onClick={flow.togglePreview}
              >
                <MaterialIcon
                  name={flow.isPreviewing ? "stop" : "play_arrow"}
                  fill
                  className="size-5"
                />
                {flow.isPreviewing ? "Stop Preview" : "Preview Flow"}
              </Button>

              {!hasEnoughPoints && (
                <p className="mt-2 text-center text-[10px] text-warning-main">
                  Add at least two points to preview and play this flow.
                </p>
              )}
            </Section>

            <button
              type="button"
              onClick={() => flow.deleteFlow(activeFlow.id)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/40 px-4 py-3 text-sm text-red-300 transition hover:bg-red-500/10"
            >
              <MaterialIcon name="delete" className="size-5" />
              Delete Flow Material
            </button>
          </>
        )}
      </div>
    </div>
  );
}
