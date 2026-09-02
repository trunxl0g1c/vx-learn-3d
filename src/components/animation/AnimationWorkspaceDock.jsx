import { useState } from "react";
import MaterialIcon from "../ui/material-icon";
import Button from "../ui/button";
import AnimationTimelineGrid from "./AnimationTimelineGrid";
import AnimationRigToolbar from "./AnimationRigToolbar";
import SelectField from "../ui/select";
import Checkbox from "../ui/checkbox";
import Slider from "../ui/slider";
import ConfirmationDialog from "../dialog/ConfirmationDialog";

const TRANSFORM_MODES = [
  { id: "translate", label: "Move", icon: "open_with" },
  { id: "rotate", label: "Rotate", icon: "360" },
  { id: "scale", label: "Scale", icon: "aspect_ratio" },
];

const MIN_DOCK_HEIGHT = 220;
const MAX_DOCK_HEIGHT = 720;

function formatTime(value) {
  return `${Number(value || 0).toFixed(2)}s`;
}

function jumpToAdjacentKeyframe(animationAuthoring, direction) {
  const keyframes = [
    ...(animationAuthoring?.activeTrack?.keyframes || []),
  ].sort((a, b) => Number(a.time) - Number(b.time));
  if (keyframes.length === 0) return;

  const currentTime = Number(animationAuthoring?.currentTime) || 0;
  const epsilon = 0.0001;
  const target =
    direction < 0
      ? [...keyframes]
          .reverse()
          .find((keyframe) => Number(keyframe.time) < currentTime - epsilon) ||
        keyframes[0]
      : keyframes.find(
          (keyframe) => Number(keyframe.time) > currentTime + epsilon,
        ) || keyframes[keyframes.length - 1];

  animationAuthoring?.selectKeyframe?.(target.id);
}

export default function AnimationWorkspaceDock({
  animationAuthoring,
  selectedObjectName,
  dockHeight,
  onDockHeightChange,
}) {
  const [confirmDeleteAnimationOpen, setConfirmDeleteAnimationOpen] =
    useState(false);
  const [confirmDeleteKeyframeOpen, setConfirmDeleteKeyframeOpen] =
    useState(false);

  if (!animationAuthoring?.isAuthoringActive) return null;

  const beginDockResize = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();

    const startY = event.clientY;
    const startHeight = dockHeight;
    const maxHeight = Math.min(MAX_DOCK_HEIGHT, window.innerHeight - 160);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    const handleMove = (moveEvent) => {
      const nextHeight = startHeight + (startY - moveEvent.clientY);
      onDockHeightChange?.(
        Math.min(maxHeight, Math.max(MIN_DOCK_HEIGHT, nextHeight)),
      );
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  };

  const animations = animationAuthoring.animations || [];
  const animation = animationAuthoring.activeAnimation;
  const activeTrack = animationAuthoring.activeTrack;
  const selectedKeyframe = animationAuthoring.selectedKeyframe;
  const rigType = activeTrack?.rig?.type || "free";

  return (
    <section
      className="absolute bottom-0 left-[60px] right-0 z-[150] flex min-w-0 flex-col overflow-hidden border-t border-divider-main bg-[#0f1515]/98 text-white shadow-[0_-16px_40px_rgba(0,0,0,0.32)] backdrop-blur-xl"
      style={{ height: dockHeight }}
    >
      <div
        onPointerDown={beginDockResize}
        title="Drag to resize the timeline panel"
        className="group absolute inset-x-0 top-0 z-160 h-1.5 -translate-y-1/2 cursor-row-resize touch-none"
      >
        <div className="mx-auto h-0.5 w-full bg-transparent transition-colors group-hover:bg-accent-main" />
      </div>

      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-divider-main bg-[#172020] px-3">
        <button
          type="button"
          title="Back to Pro Tools"
          onClick={animationAuthoring?.stopAuthoring}
          className="cursor-pointer grid size-8 shrink-0 place-items-center rounded-lg text-secondary-default transition hover:bg-white/10"
        >
          <MaterialIcon name="chevron_backward" size={20} />
        </button>

        <div className="mr-1 hidden shrink-0 lg:block">
          <p className="text-sm font-normal text-white">Animation</p>
          <p className="text-xs text-contrast-grayout">Timeline Workspace</p>
        </div>

        <SelectField
          value={animationAuthoring?.activeAnimationId || ""}
          onChange={(value) => animationAuthoring?.selectAnimation?.(value)}
          options={animations.map((item) => ({
            value: item.id,
            label: item.name,
          }))}
          placeholder="Select animation"
          className="h-8! w-44! shrink-0 text-[11px]"
        />

        <Button
          type="button"
          size="xs"
          onClick={animationAuthoring?.createAnimation}
        >
          New
          <MaterialIcon name="add" size={20} />
        </Button>

        {animation && (
          <>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={animationAuthoring?.duplicateAnimation}
              title="Duplicate animation"
            >
              <MaterialIcon name="content_copy" size={20} />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="destructive"
              title="Delete animation"
              onClick={() => setConfirmDeleteAnimationOpen(true)}
            >
              <MaterialIcon name="delete" size={20} />
            </Button>

            <ConfirmationDialog
              open={confirmDeleteAnimationOpen}
              title="Delete Animation?"
              message={`Delete "${animation?.name || "this animation"}"?`}
              description="All of its tracks and keyframes will be removed. This action cannot be undone."
              confirmText="Delete Animation"
              onClose={() => setConfirmDeleteAnimationOpen(false)}
              onConfirm={() => {
                animationAuthoring?.deleteAnimation?.();
                setConfirmDeleteAnimationOpen(false);
              }}
            />

            <div className="mx-1 h-6 w-px shrink-0 bg-divider-main" />

            <Button
              type="button"
              title="Previous keyframe"
              size="icon"
              variant="ghost"
              onClick={() => jumpToAdjacentKeyframe(animationAuthoring, -1)}
              disabled={!activeTrack?.keyframes?.length}
              className="group"
            >
              <MaterialIcon
                name="skip_previous"
                size={20}
                className="text-contrast-grayout group-hover:text-white"
              />
            </Button>

            <Button
              type="button"
              title={animationAuthoring?.isPreviewing ? "Pause" : "Play"}
              size="icon"
              variant="default"
              disabled={
                !animation?.tracks?.some((track) => track.keyframes?.length)
              }
              onClick={
                animationAuthoring?.isPreviewing
                  ? animationAuthoring?.pausePreview
                  : animationAuthoring?.playPreview
              }
            >
              <MaterialIcon
                name={animationAuthoring?.isPreviewing ? "pause" : "play_arrow"}
                size={20}
              />
            </Button>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              title="Stop preview"
              onClick={animationAuthoring?.stopPreview}
              className="group"
            >
              <MaterialIcon
                name="stop"
                size={20}
                className="text-contrast-grayout group-hover:text-white"
              />
            </Button>

            <Button
              type="button"
              title="Next keyframe"
              size="icon"
              variant="ghost"
              onClick={() => jumpToAdjacentKeyframe(animationAuthoring, 1)}
              disabled={!activeTrack?.keyframes?.length}
              className="group"
            >
              <MaterialIcon
                name="skip_next"
                size={20}
                className="text-contrast-grayout group-hover:text-white"
              />
            </Button>

            <div className="ml-1 rounded-lg border border-accent-main bg-primary/60 px-2.5 py-1.5 text-sm text-white">
              {formatTime(animationAuthoring?.currentTime)} /{" "}
              {formatTime(animation.duration)}
            </div>
          </>
        )}
      </div>

      {animation && (
        <div className="flex h-14 shrink-0 items-center gap-2 overflow-x-auto border-b border-divider-main bg-[#121919] px-3 scrollbar-thin">
          <input
            value={animation.name}
            onChange={(event) =>
              animationAuthoring.updateAnimation(animation.id, {
                name: event.target.value,
              })
            }
            title="Animation name"
            className="h-9 w-40 shrink-0 rounded-lg border border-secondary-default/50 bg-primary px-2.5 text-[11px] text-white outline-none focus:border-secondary-default"
          />

          <input
            value={animation.description || ""}
            onChange={(event) =>
              animationAuthoring.updateAnimation(animation.id, {
                description: event.target.value,
              })
            }
            placeholder="Description"
            title="Animation description"
            className="h-9 w-48 shrink-0 rounded-lg border border-divider-main bg-primary px-2.5 text-[11px] text-white outline-none focus:border-secondary-default"
          />

          <label className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-divider-main bg-primary/70 px-2.5">
            <span className="text-[9px] uppercase tracking-wide text-contrast-grayout">
              Duration
            </span>
            <input
              type="number"
              min="0.1"
              max="3600"
              step="0.1"
              value={animation.duration}
              onChange={(event) =>
                animationAuthoring.updateAnimation(animation.id, {
                  duration: Number(event.target.value) || 0.1,
                })
              }
              className="w-10 bg-transparent text-right font-mono text-[11px] text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-[9px] text-contrast-grayout">s</span>
          </label>

          <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2">
            <span className="text-[9px] uppercase tracking-wide text-contrast-grayout">
              Speed
            </span>
            <select
              value={animation.settings?.speed || 1}
              onChange={(event) =>
                animationAuthoring.updateAnimation(animation.id, {
                  settings: { speed: Number(event.target.value) || 1 },
                })
              }
              className="bg-transparent text-[10px] text-white outline-none"
            >
              {[0.25, 0.5, 0.75, 1, 1.5, 2, 3].map((speed) => (
                <option key={speed} value={speed} className="bg-primary">
                  {speed}x
                </option>
              ))}
            </select>
          </label>

          <label className="flex h-8 shrink-0 items-center gap-2 rounded-lg border border-divider-main bg-primary/70 px-2 text-[10px] text-white">
            <Checkbox
              checked={animation.settings?.loop === true}
              onCheckedChange={(checked) =>
                animationAuthoring.updateAnimation(animation.id, {
                  settings: { loop: checked },
                })
              }
            />
            Loop
          </label>

          <div className="h-6 w-px shrink-0 bg-divider-main" />

          <div className="flex shrink-0 items-center gap-1">
            {TRANSFORM_MODES.map((mode) => {
              const disabled =
                rigType === "hydraulic" ||
                rigType === "morph" ||
                (rigType === "revolute" && mode.id !== "rotate") ||
                (rigType === "linear" && mode.id !== "translate");

              return (
                <button
                  key={mode.id}
                  type="button"
                  title={`${mode.label} gizmo`}
                  disabled={disabled}
                  onClick={() =>
                    animationAuthoring?.setTransformMode?.(mode.id)
                  }
                  className={[
                    "cursor-pointer flex h-8 items-center gap-1 rounded-lg border px-2 text-[10px] transition disabled:cursor-not-allowed disabled:opacity-25",
                    animationAuthoring?.transformMode === mode.id && !disabled
                      ? "border-accent-main bg-accent-main/15 text-white"
                      : "border-divider-main text-contrast-grayout hover:bg-white/5 hover:text-white",
                  ].join(" ")}
                >
                  <MaterialIcon name={mode.icon} size={20} />
                  {mode.label}
                </button>
              );
            })}
          </div>

          <div className="h-6 w-px shrink-0 bg-divider-main" />

          <div className="flex h-8 min-w-0 shrink-0 items-center gap-2 rounded-lg border border-divider-main bg-primary/70 pl-2 pr-1">
            <span
              className="max-w-32 truncate text-xs text-contrast-grayout"
              title={selectedObjectName || "No viewport object selected"}
            >
              {selectedObjectName || "Select object"}
            </span>
            <Button
              type="button"
              size="xs"
              disabled={!selectedObjectName}
              onClick={animationAuthoring?.addTrackFromSelectedObject}
              className="h-6 px-2 text-xs"
            >
              <MaterialIcon name="add" size={20} />
              Add Track
            </Button>
          </div>

          <Button
            type="button"
            size="xs"
            disabled={!activeTrack || !animationAuthoring?.activeTrackObject}
            onClick={animationAuthoring?.addOrUpdateKeyframe}
            className="h-8 shrink-0"
          >
            <MaterialIcon name="key" size={20} />
            Save Keyframe
          </Button>

          {selectedKeyframe && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-accent-main px-1.5">
                <span className="px-1 text-xs uppercase tracking-wide text-secondary-default">
                  Key
                </span>
                <input
                  type="number"
                  min="0"
                  max={animation.duration}
                  step="0.01"
                  value={selectedKeyframe.time}
                  onChange={(event) => {
                    animationAuthoring?.updateKeyframe?.(selectedKeyframe.id, {
                      time: event.target.value,
                    });
                    animationAuthoring?.scrubTo?.(event.target.value);
                  }}
                  title="Keyframe time"
                  className="w-12 bg-transparent text-right font-mono text-[11px] text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="text-xs text-contrast-grayout">s</span>
                {rigType === "morph" && (
                  <label
                    className="ml-1 flex items-center gap-1 rounded-md border border-secondary-default/50 bg-secondary-default/5 px-1.5"
                    title="Morph progress is interpolated smoothly between keyframes"
                  >
                    <span className="text-[8px] uppercase tracking-wide text-secondary-default">
                      Morph
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(
                        (Number(selectedKeyframe.morphProgress) || 0) * 100,
                      )}
                      onChange={(event) =>
                        animationAuthoring?.updateKeyframe?.(
                          selectedKeyframe.id,
                          {
                            morphProgress: Number(event.target.value) / 100,
                          },
                        )
                      }
                      className="w-20 accent-accent-main"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(
                        (Number(selectedKeyframe.morphProgress) || 0) * 100,
                      )}
                      onChange={(event) =>
                        animationAuthoring?.updateKeyframe?.(
                          selectedKeyframe.id,
                          {
                            morphProgress:
                              Math.max(
                                0,
                                Math.min(100, Number(event.target.value) || 0),
                              ) / 100,
                          },
                        )
                      }
                      className="w-8 bg-transparent text-right font-mono text-[9px] text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-xs text-contrast-grayout">%</span>
                  </label>
                )}
                <label
                  className="ml-1 flex items-center gap-1 rounded-md border border-divider-main/70 px-1.5"
                  title="Opacity is interpolated smoothly to the next keyframe"
                >
                  <span className="text-[9px] uppercase tracking-wide text-contrast-grayout">
                    Opacity
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(
                      (Number(selectedKeyframe.opacity) || 0) * 100,
                    )}
                    onChange={(event) =>
                      animationAuthoring?.updateKeyframe?.(
                        selectedKeyframe.id,
                        {
                          opacity: Number(event.target.value) / 100,
                        },
                      )
                    }
                    className="cursor-pointer w-16 accent-accent-main"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(
                      (Number(selectedKeyframe.opacity) || 0) * 100,
                    )}
                    onChange={(event) =>
                      animationAuthoring?.updateKeyframe?.(
                        selectedKeyframe.id,
                        {
                          opacity:
                            Math.max(
                              0,
                              Math.min(100, Number(event.target.value) || 0),
                            ) / 100,
                        },
                      )
                    }
                    className="w-8 bg-transparent text-right text-[9px] text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                  <span className="text-xs text-contrast-grayout">%</span>
                </label>
                <select
                  value={selectedKeyframe.easing || "easeInOut"}
                  onChange={(event) =>
                    animationAuthoring?.updateKeyframe?.(selectedKeyframe.id, {
                      easing: event.target.value,
                    })
                  }
                  title="Keyframe easing"
                  className="cursor-pointer ml-1 bg-transparent text-[10px] text-white outline-none"
                >
                  <option value="linear" className="bg-primary">
                    Linear
                  </option>
                  <option value="easeIn" className="bg-primary">
                    Ease In
                  </option>
                  <option value="easeOut" className="bg-primary">
                    Ease Out
                  </option>
                  <option value="easeInOut" className="bg-primary">
                    Ease In Out
                  </option>
                </select>
              </div>
              <Button
                type="button"
                size="icon"
                variant="outline"
                title="Delete selected keyframe"
                onClick={() => setConfirmDeleteKeyframeOpen(true)}
                className="bg-red-500/10! text-red-300! border-none!"
              >
                <MaterialIcon name="delete" size={20} />
              </Button>

              <ConfirmationDialog
                open={confirmDeleteKeyframeOpen}
                title="Delete Keyframe?"
                message={`Delete the keyframe at ${formatTime(selectedKeyframe.time)}?`}
                confirmText="Delete Keyframe"
                onClose={() => setConfirmDeleteKeyframeOpen(false)}
                onConfirm={() => {
                  animationAuthoring?.deleteKeyframe?.(selectedKeyframe.id);
                  setConfirmDeleteKeyframeOpen(false);
                }}
              />
            </div>
          )}
        </div>
      )}

      <AnimationRigToolbar
        animationAuthoring={animationAuthoring}
        selectedObjectName={selectedObjectName}
      />

      <AnimationTimelineGrid animationAuthoring={animationAuthoring} />
    </section>
  );
}
