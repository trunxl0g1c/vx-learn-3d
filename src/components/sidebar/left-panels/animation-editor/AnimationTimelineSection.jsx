import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";

const formatTime = (value) => `${Number(value || 0).toFixed(2)}s`;

export default function AnimationTimelineSection({ animationAuthoring }) {
  const animation = animationAuthoring?.activeAnimation;
  const track = animationAuthoring?.activeTrack;
  const keyframes = track?.keyframes || [];
  const selectedKeyframe = animationAuthoring?.selectedKeyframe;
  if (!animation) return null;

  return (
    <section className="rounded-xl border border-secondary-default/60 bg-[#171b1b] p-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-7 place-items-center rounded-full bg-accent-main text-xs font-bold text-white">
          4
        </span>
        <h3 className="text-sm font-semibold text-white">Timeline & Keyframes</h3>
      </div>

      <div className="rounded-lg border border-divider-main bg-primary/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-contrast-grayout">Current Time</span>
          <span className="font-mono text-xs font-semibold text-secondary-default">
            {formatTime(animationAuthoring?.currentTime)} / {formatTime(animation.duration)}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max={animation.duration}
          step="0.01"
          value={Math.min(animationAuthoring?.currentTime || 0, animation.duration)}
          onChange={(event) => animationAuthoring?.scrubTo?.(event.target.value)}
          className="w-full accent-accent-main"
        />

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button
            type="button"
            size="xs"
            onClick={animationAuthoring?.playPreview}
            disabled={!track || keyframes.length === 0}
          >
            <MaterialIcon name="play_arrow" className="size-4" />
            Play
          </Button>
          <Button
            type="button"
            size="xs"
            variant="darkOutline"
            onClick={animationAuthoring?.pausePreview}
            disabled={!animationAuthoring?.isPreviewing}
          >
            <MaterialIcon name="pause" className="size-4" />
            Pause
          </Button>
          <Button
            type="button"
            size="xs"
            variant="darkOutline"
            onClick={animationAuthoring?.stopPreview}
          >
            <MaterialIcon name="stop" className="size-4" />
            Stop
          </Button>
        </div>
      </div>

      <Button
        type="button"
        size="sm"
        className="mt-3 w-full"
        disabled={!track || !animationAuthoring?.activeTrackObject}
        onClick={animationAuthoring?.addOrUpdateKeyframe}
      >
        <MaterialIcon name="key" className="size-4" />
        Save / Update Keyframe at {formatTime(animationAuthoring?.currentTime)}
      </Button>

      {!track ? (
        <p className="mt-3 text-xs leading-5 text-contrast-grayout">
          Select an object track to author keyframes.
        </p>
      ) : keyframes.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-divider-main p-3 text-xs leading-5 text-contrast-grayout">
          No keyframes yet. Capture the current transform at 0s, move the
          timeline, change the object transform, then capture another keyframe.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">Keyframes</span>
            <span className="text-[10px] text-contrast-grayout">
              {track.object?.name}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {keyframes.map((keyframe, index) => (
              <button
                key={keyframe.id}
                type="button"
                onClick={() => animationAuthoring?.selectKeyframe?.(keyframe.id)}
                className={[
                  "rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition",
                  keyframe.id === animationAuthoring?.selectedKeyframeId
                    ? "border-accent-main bg-accent-main/15 text-white"
                    : "border-divider-main bg-primary/50 text-contrast-grayout hover:text-white",
                ].join(" ")}
              >
                K{index + 1} · {formatTime(keyframe.time)}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedKeyframe && (
        <div className="mt-4 rounded-lg border border-divider-main bg-primary/40 p-3">
          <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] items-end gap-2">
            <label className="block">
              <span className="mb-1.5 block text-[11px] text-contrast-grayout">
                Time (sec)
              </span>
              <input
                type="number"
                min="0"
                max={animation.duration}
                step="0.01"
                value={selectedKeyframe.time}
                onChange={(event) =>
                  animationAuthoring?.updateKeyframe?.(selectedKeyframe.id, {
                    time: event.target.value,
                  })
                }
                className="h-9 w-full rounded-lg border border-secondary-default/60 bg-primary px-2 text-xs text-white outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] text-contrast-grayout">
                Easing into this keyframe
              </span>
              <select
                value={selectedKeyframe.easing || "easeInOut"}
                onChange={(event) =>
                  animationAuthoring?.updateKeyframe?.(selectedKeyframe.id, {
                    easing: event.target.value,
                  })
                }
                className="h-9 w-full rounded-lg border border-secondary-default/60 bg-primary px-2 text-xs text-white outline-none"
              >
                <option value="linear">Linear</option>
                <option value="easeIn">Ease In</option>
                <option value="easeOut">Ease Out</option>
                <option value="easeInOut">Ease In Out</option>
              </select>
            </label>
            <button
              type="button"
              title="Delete keyframe"
              onClick={() => animationAuthoring?.deleteKeyframe?.(selectedKeyframe.id)}
              className="grid size-9 place-items-center rounded-lg border border-divider-main text-contrast-grayout transition hover:bg-white/10 hover:text-white"
            >
              <MaterialIcon name="delete" className="size-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
