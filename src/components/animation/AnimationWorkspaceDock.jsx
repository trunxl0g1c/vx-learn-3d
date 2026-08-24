import MaterialIcon from "../ui/material-icon";
import Button from "../ui/button";
import AnimationTimelineGrid from "./AnimationTimelineGrid";
import AnimationRigToolbar from "./AnimationRigToolbar";

const TRANSFORM_MODES = [
  { id: "translate", label: "Move", icon: "open_with" },
  { id: "rotate", label: "Rotate", icon: "360" },
  { id: "scale", label: "Scale", icon: "aspect_ratio" },
];

function formatTime(value) {
  return `${Number(value || 0).toFixed(2)}s`;
}

function jumpToAdjacentKeyframe(animationAuthoring, direction) {
  const keyframes = [...(animationAuthoring?.activeTrack?.keyframes || [])].sort(
    (a, b) => Number(a.time) - Number(b.time),
  );
  if (keyframes.length === 0) return;

  const currentTime = Number(animationAuthoring?.currentTime) || 0;
  const epsilon = 0.0001;
  const target =
    direction < 0
      ? [...keyframes]
          .reverse()
          .find((keyframe) => Number(keyframe.time) < currentTime - epsilon) || keyframes[0]
      : keyframes.find((keyframe) => Number(keyframe.time) > currentTime + epsilon) ||
        keyframes[keyframes.length - 1];

  animationAuthoring?.selectKeyframe?.(target.id);
}

export default function AnimationWorkspaceDock({
  animationAuthoring,
  selectedObjectName,
}) {
  if (!animationAuthoring?.isAuthoringActive) return null;

  const animations = animationAuthoring.animations || [];
  const animation = animationAuthoring.activeAnimation;
  const activeTrack = animationAuthoring.activeTrack;
  const selectedKeyframe = animationAuthoring.selectedKeyframe;
  const rigType = activeTrack?.rig?.type || "free";

  return (
    <section className="absolute bottom-0 left-[60px] right-0 z-[150] flex h-[360px] min-w-0 flex-col overflow-hidden border-t border-divider-main bg-[#0f1515]/98 text-white shadow-[0_-16px_40px_rgba(0,0,0,0.32)] backdrop-blur-xl">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-divider-main bg-[#172020] px-3">
        <button
          type="button"
          title="Back to Pro Tools"
          onClick={animationAuthoring?.stopAuthoring}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-secondary-default transition hover:bg-white/10"
        >
          <MaterialIcon name="arrow_back" className="size-5" />
        </button>

        <div className="mr-1 hidden shrink-0 lg:block">
          <p className="text-xs font-semibold text-white">Animation</p>
          <p className="text-[9px] text-contrast-grayout">Timeline Workspace</p>
        </div>

        <select
          value={animationAuthoring?.activeAnimationId || ""}
          onChange={(event) =>
            animationAuthoring?.selectAnimation?.(event.target.value || null)
          }
          className="h-8 w-44 shrink-0 rounded-lg border border-secondary-default/60 bg-primary px-2 text-[11px] text-white outline-none focus:border-secondary-default"
        >
          <option value="">Select animation</option>
          {animations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <Button type="button" size="xs" onClick={animationAuthoring?.createAnimation}>
          <MaterialIcon name="add" className="size-4" />
          New
        </Button>

        {animation && (
          <>
            <button
              type="button"
              title="Duplicate animation"
              onClick={animationAuthoring?.duplicateAnimation}
              className="grid size-8 shrink-0 place-items-center rounded-lg border border-divider-main text-contrast-grayout transition hover:bg-white/5 hover:text-white"
            >
              <MaterialIcon name="content_copy" className="size-4" />
            </button>
            <button
              type="button"
              title="Delete animation"
              onClick={() => animationAuthoring?.deleteAnimation?.()}
              className="grid size-8 shrink-0 place-items-center rounded-lg border border-divider-main text-contrast-grayout transition hover:bg-red-500/10 hover:text-red-300"
            >
              <MaterialIcon name="delete" className="size-4" />
            </button>

            <div className="mx-1 h-6 w-px shrink-0 bg-divider-main" />

            <button
              type="button"
              title="Previous keyframe"
              onClick={() => jumpToAdjacentKeyframe(animationAuthoring, -1)}
              disabled={!activeTrack?.keyframes?.length}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-contrast-grayout transition hover:bg-white/5 hover:text-white disabled:opacity-30"
            >
              <MaterialIcon name="skip_previous" className="size-4" />
            </button>
            <button
              type="button"
              title={animationAuthoring?.isPreviewing ? "Pause" : "Play"}
              onClick={
                animationAuthoring?.isPreviewing
                  ? animationAuthoring?.pausePreview
                  : animationAuthoring?.playPreview
              }
              disabled={!animation?.tracks?.some((track) => track.keyframes?.length)}
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-main text-white transition hover:bg-accent-main/80 disabled:opacity-30"
            >
              <MaterialIcon
                name={animationAuthoring?.isPreviewing ? "pause" : "play_arrow"}
                className="size-5"
              />
            </button>
            <button
              type="button"
              title="Stop preview"
              onClick={animationAuthoring?.stopPreview}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-contrast-grayout transition hover:bg-white/5 hover:text-white"
            >
              <MaterialIcon name="stop" className="size-5" />
            </button>
            <button
              type="button"
              title="Next keyframe"
              onClick={() => jumpToAdjacentKeyframe(animationAuthoring, 1)}
              disabled={!activeTrack?.keyframes?.length}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-contrast-grayout transition hover:bg-white/5 hover:text-white disabled:opacity-30"
            >
              <MaterialIcon name="skip_next" className="size-4" />
            </button>

            <div className="ml-1 rounded-lg border border-divider-main bg-primary/60 px-2.5 py-1.5 font-mono text-[10px] text-secondary-default">
              {formatTime(animationAuthoring?.currentTime)} / {formatTime(animation.duration)}
            </div>
          </>
        )}
      </div>

      {animation && (
        <div className="flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-b border-divider-main bg-[#121919] px-3 scrollbar-thin">
          <input
            value={animation.name}
            onChange={(event) =>
              animationAuthoring.updateAnimation(animation.id, {
                name: event.target.value,
              })
            }
            title="Animation name"
            className="h-8 w-40 shrink-0 rounded-lg border border-secondary-default/50 bg-primary px-2.5 text-[11px] text-white outline-none focus:border-secondary-default"
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
            className="h-8 w-48 shrink-0 rounded-lg border border-divider-main bg-primary px-2.5 text-[11px] text-white outline-none focus:border-secondary-default"
          />

          <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2">
            <span className="text-[9px] uppercase tracking-wide text-contrast-grayout">Duration</span>
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
              className="w-14 bg-transparent text-right font-mono text-[10px] text-white outline-none"
            />
            <span className="text-[9px] text-contrast-grayout">s</span>
          </label>

          <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2">
            <span className="text-[9px] uppercase tracking-wide text-contrast-grayout">Speed</span>
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
            <input
              type="checkbox"
              checked={animation.settings?.loop === true}
              onChange={(event) =>
                animationAuthoring.updateAnimation(animation.id, {
                  settings: { loop: event.target.checked },
                })
              }
              className="size-3.5 accent-accent-main"
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
                onClick={() => animationAuthoring?.setTransformMode?.(mode.id)}
                className={[
                  "flex h-8 items-center gap-1 rounded-lg border px-2 text-[10px] transition disabled:cursor-not-allowed disabled:opacity-25",
                  animationAuthoring?.transformMode === mode.id && !disabled
                    ? "border-accent-main bg-accent-main/15 text-white"
                    : "border-divider-main text-contrast-grayout hover:bg-white/5 hover:text-white",
                ].join(" ")}
              >
                <MaterialIcon name={mode.icon} className="size-3.5" />
                {mode.label}
              </button>
              );
            })}
          </div>

          <div className="h-6 w-px shrink-0 bg-divider-main" />

          <div className="flex h-8 min-w-0 shrink-0 items-center gap-2 rounded-lg border border-divider-main bg-primary/70 pl-2 pr-1">
            <span className="max-w-32 truncate text-[10px] text-contrast-grayout" title={selectedObjectName || "No viewport object selected"}>
              {selectedObjectName || "Select object"}
            </span>
            <Button
              type="button"
              size="xs"
              disabled={!selectedObjectName}
              onClick={animationAuthoring?.addTrackFromSelectedObject}
              className="h-6 px-2 text-[10px]"
            >
              <MaterialIcon name="add" className="size-3" />
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
            <MaterialIcon name="key" className="size-4" />
            Save Keyframe
          </Button>

          {selectedKeyframe && (
            <div className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-accent-main/40 bg-accent-main/10 px-1.5">
              <span className="px-1 text-[9px] uppercase tracking-wide text-secondary-default">Key</span>
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
                className="w-14 bg-transparent text-right font-mono text-[10px] text-white outline-none"
              />
              <span className="text-[9px] text-contrast-grayout">s</span>
              {rigType === "morph" && (
                <label
                  className="ml-1 flex items-center gap-1 rounded-md border border-secondary-default/50 bg-secondary-default/5 px-1.5"
                  title="Morph progress is interpolated smoothly between keyframes"
                >
                  <span className="text-[8px] uppercase tracking-wide text-secondary-default">Morph</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round((Number(selectedKeyframe.morphProgress) || 0) * 100)}
                    onChange={(event) =>
                      animationAuthoring?.updateKeyframe?.(selectedKeyframe.id, {
                        morphProgress: Number(event.target.value) / 100,
                      })
                    }
                    className="w-20 accent-accent-main"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round((Number(selectedKeyframe.morphProgress) || 0) * 100)}
                    onChange={(event) =>
                      animationAuthoring?.updateKeyframe?.(selectedKeyframe.id, {
                        morphProgress:
                          Math.max(0, Math.min(100, Number(event.target.value) || 0)) /
                          100,
                      })
                    }
                    className="w-10 bg-transparent text-right font-mono text-[9px] text-white outline-none"
                  />
                  <span className="text-[8px] text-contrast-grayout">%</span>
                </label>
              )}
              <label
                className="ml-1 flex items-center gap-1 rounded-md border border-divider-main/70 px-1.5"
                title="Opacity is interpolated smoothly to the next keyframe"
              >
                <span className="text-[8px] uppercase tracking-wide text-contrast-grayout">Opacity</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round((Number(selectedKeyframe.opacity) || 0) * 100)}
                  onChange={(event) =>
                    animationAuthoring?.updateKeyframe?.(selectedKeyframe.id, {
                      opacity: Number(event.target.value) / 100,
                    })
                  }
                  className="w-16 accent-accent-main"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round((Number(selectedKeyframe.opacity) || 0) * 100)}
                  onChange={(event) =>
                    animationAuthoring?.updateKeyframe?.(selectedKeyframe.id, {
                      opacity: Math.max(
                        0,
                        Math.min(100, Number(event.target.value) || 0),
                      ) / 100,
                    })
                  }
                  className="w-10 bg-transparent text-right font-mono text-[9px] text-white outline-none"
                />
                <span className="text-[8px] text-contrast-grayout">%</span>
              </label>
              <select
                value={selectedKeyframe.easing || "easeInOut"}
                onChange={(event) =>
                  animationAuthoring?.updateKeyframe?.(selectedKeyframe.id, {
                    easing: event.target.value,
                  })
                }
                title="Keyframe easing"
                className="ml-1 bg-transparent text-[10px] text-white outline-none"
              >
                <option value="linear" className="bg-primary">Linear</option>
                <option value="easeIn" className="bg-primary">Ease In</option>
                <option value="easeOut" className="bg-primary">Ease Out</option>
                <option value="easeInOut" className="bg-primary">Ease In Out</option>
              </select>
              <button
                type="button"
                title="Delete selected keyframe"
                onClick={() => animationAuthoring?.deleteKeyframe?.(selectedKeyframe.id)}
                className="grid size-6 place-items-center rounded-md text-contrast-grayout transition hover:bg-red-500/10 hover:text-red-300"
              >
                <MaterialIcon name="delete" className="size-3.5" />
              </button>
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
