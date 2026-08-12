import { useMemo, useState } from "react";
import MaterialIcon from "../ui/material-icon";

const TRACK_COLUMN_WIDTH = 248;
const ZOOM_LEVELS = [60, 90, 120, 180, 240];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(value) {
  return `${Number(value || 0).toFixed(2)}s`;
}

function getMajorStep(pixelsPerSecond) {
  const candidates = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  return candidates.find((step) => step * pixelsPerSecond >= 72) || 300;
}

function getTrackDepth(track, tracks) {
  const byId = new Map((tracks || []).map((item) => [item.id, item]));
  const visited = new Set([track.id]);
  let depth = 0;
  let parentId = track.rig?.parentTrackId || null;

  while (
    parentId &&
    byId.has(parentId) &&
    depth < 4 &&
    !visited.has(parentId)
  ) {
    visited.add(parentId);
    depth += 1;
    parentId = byId.get(parentId)?.rig?.parentTrackId || null;
  }

  return depth;
}

function getRigLabel(track) {
  const type = track?.rig?.type || "free";
  if (type === "revolute") return `REV ${String(track.rig?.axis || "y").toUpperCase()}`;
  if (type === "linear") return `LIN ${String(track.rig?.axis || "y").toUpperCase()}`;
  if (type === "hydraulic") return "HYD";
  return "FREE";
}

function buildTicks(duration, pixelsPerSecond) {
  const step = getMajorStep(pixelsPerSecond);
  const count = Math.min(160, Math.ceil(duration / step) + 1);

  return Array.from({ length: count }, (_, index) => {
    const time = Math.min(duration, index * step);
    return { time, label: formatTime(time) };
  }).filter((tick, index, list) => index === 0 || tick.time !== list[index - 1].time);
}

export default function AnimationTimelineGrid({ animationAuthoring }) {
  const animation = animationAuthoring?.activeAnimation;
  const tracks = animation?.tracks || [];
  const [zoomIndex, setZoomIndex] = useState(2);
  const [draggingKeyframe, setDraggingKeyframe] = useState(null);
  const [draggingTrackId, setDraggingTrackId] = useState(null);
  const [trackDropTarget, setTrackDropTarget] = useState(null);

  const duration = Math.max(0.1, Number(animation?.duration) || 2);
  const pixelsPerSecond = ZOOM_LEVELS[zoomIndex];
  const timelineWidth = Math.max(760, Math.ceil(duration * pixelsPerSecond) + 48);
  const ticks = useMemo(
    () => buildTicks(duration, pixelsPerSecond),
    [duration, pixelsPerSecond],
  );

  if (!animation) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center border-t border-divider-main bg-[#101616] px-6 text-center">
        <div>
          <MaterialIcon name="animation" className="mx-auto size-9 text-secondary-default" />
          <p className="mt-2 text-sm font-semibold text-white">No animation selected</p>
          <p className="mt-1 text-xs text-contrast-grayout">
            Create or select an animation from the toolbar above.
          </p>
        </div>
      </div>
    );
  }

  const timeFromPointer = (clientX, rect) =>
    clamp((clientX - rect.left) / pixelsPerSecond, 0, duration);

  const scrubFromPointer = (event) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    animationAuthoring?.scrubTo?.(timeFromPointer(event.clientX, rect));
  };

  const beginTrackDrag = (event, trackId) => {
    event.stopPropagation();
    setDraggingTrackId(trackId);
    setTrackDropTarget(null);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", trackId);
    }
  };

  const updateTrackDropTarget = (event, targetTrackId) => {
    if (!draggingTrackId || draggingTrackId === targetTrackId) return;
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    const placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";

    setTrackDropTarget((current) =>
      current?.id === targetTrackId && current?.placement === placement
        ? current
        : { id: targetTrackId, placement },
    );
  };

  const dropTrack = (event, targetTrackId) => {
    event.preventDefault();
    event.stopPropagation();

    const sourceTrackId =
      draggingTrackId || event.dataTransfer?.getData("text/plain") || null;
    const placement =
      trackDropTarget?.id === targetTrackId
        ? trackDropTarget.placement
        : "before";

    if (sourceTrackId && sourceTrackId !== targetTrackId) {
      animationAuthoring?.reorderTrack?.(
        sourceTrackId,
        targetTrackId,
        placement,
      );
      animationAuthoring?.setActiveTrackId?.(sourceTrackId);
    }

    setDraggingTrackId(null);
    setTrackDropTarget(null);
  };

  const endTrackDrag = () => {
    setDraggingTrackId(null);
    setTrackDropTarget(null);
  };

  const beginKeyframeDrag = (event, track, keyframe) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    animationAuthoring?.setActiveTrackId?.(track.id);
    animationAuthoring?.setSelectedKeyframeId?.(keyframe.id);
    animationAuthoring?.scrubTo?.(keyframe.time);

    const row = event.currentTarget.parentElement;
    const rect = row.getBoundingClientRect();
    let nextTime = Number(keyframe.time) || 0;

    setDraggingKeyframe({ id: keyframe.id, time: nextTime });

    const handleMove = (moveEvent) => {
      nextTime = timeFromPointer(moveEvent.clientX, rect);
      setDraggingKeyframe({ id: keyframe.id, time: nextTime });
      animationAuthoring?.scrubTo?.(nextTime);
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setDraggingKeyframe(null);
      animationAuthoring?.updateKeyframe?.(keyframe.id, { time: nextTime });
      animationAuthoring?.scrubTo?.(nextTime);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  };

  const playheadLeft = clamp(
    Number(animationAuthoring?.currentTime) || 0,
    0,
    duration,
  ) * pixelsPerSecond;

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-divider-main bg-[#101616]">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-divider-main bg-[#151c1c] px-3">
        <div className="flex items-center gap-2 text-[11px] text-contrast-grayout">
          <MaterialIcon name="timeline" className="size-4 text-secondary-default" />
          <span>Timeline</span>
          <span className="text-divider-main">•</span>
          <span>{tracks.length} track(s)</span>
          <span className="text-divider-main">•</span>
          <span>{formatTime(duration)}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Zoom out timeline"
            disabled={zoomIndex === 0}
            onClick={() => setZoomIndex((current) => Math.max(0, current - 1))}
            className="grid size-7 place-items-center rounded-md border border-divider-main text-contrast-grayout transition hover:bg-white/5 hover:text-white disabled:opacity-30"
          >
            <MaterialIcon name="remove" className="size-4" />
          </button>
          <span className="w-12 text-center text-[10px] text-contrast-grayout">
            {Math.round((pixelsPerSecond / ZOOM_LEVELS[2]) * 100)}%
          </span>
          <button
            type="button"
            title="Zoom in timeline"
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            onClick={() =>
              setZoomIndex((current) => Math.min(ZOOM_LEVELS.length - 1, current + 1))
            }
            className="grid size-7 place-items-center rounded-md border border-divider-main text-contrast-grayout transition hover:bg-white/5 hover:text-white disabled:opacity-30"
          >
            <MaterialIcon name="add" className="size-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <div
          className="relative min-h-full"
          style={{ minWidth: TRACK_COLUMN_WIDTH + timelineWidth }}
        >
          <div className="sticky top-0 z-40 flex h-8 border-b border-divider-main bg-[#141a1a]">
            <div className="sticky left-0 z-50 flex w-[248px] shrink-0 items-center border-r border-divider-main bg-[#141a1a] px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-contrast-grayout">
              Object / Track
            </div>
            <div
              className="relative h-8 shrink-0 cursor-crosshair select-none"
              style={{ width: timelineWidth }}
              onPointerDown={scrubFromPointer}
            >
              {ticks.map((tick) => (
                <div
                  key={tick.time}
                  className="absolute inset-y-0 border-l border-divider-main/80"
                  style={{ left: tick.time * pixelsPerSecond }}
                >
                  <span className="absolute left-1 top-1 whitespace-nowrap font-mono text-[9px] text-contrast-grayout">
                    {tick.label}
                  </span>
                </div>
              ))}
              <div
                className="pointer-events-none absolute inset-y-0 z-30 w-px bg-accent-main"
                style={{ left: playheadLeft }}
              />
            </div>
          </div>

          {tracks.length === 0 ? (
            <div className="flex h-24 items-center border-b border-divider-main/70">
              <div className="sticky left-0 z-20 flex h-full w-[248px] shrink-0 items-center border-r border-divider-main bg-[#121818] px-3 text-xs text-contrast-grayout">
                No object tracks
              </div>
              <div className="px-5 text-xs text-contrast-grayout">
                Select an object in the viewport and click <span className="text-white">Add Track</span>.
              </div>
            </div>
          ) : (
            tracks.map((track, trackIndex) => {
              const active = track.id === animationAuthoring?.activeTrackId;
              const keyframes = track.keyframes || [];
              const depth = getTrackDepth(track, tracks);
              const indentClass = ["pl-0", "pl-3", "pl-6", "pl-9", "pl-12"][depth] || "pl-12";

              return (
                <div
                  key={track.id}
                  onDragOver={(event) => updateTrackDropTarget(event, track.id)}
                  onDrop={(event) => dropTrack(event, track.id)}
                  className={[
                    "relative flex h-11 border-b border-divider-main/70 transition-opacity",
                    draggingTrackId === track.id ? "opacity-45" : "opacity-100",
                  ].join(" ")}
                >
                  {trackDropTarget?.id === track.id && draggingTrackId !== track.id && (
                    <div
                      className={`pointer-events-none absolute left-0 right-0 z-[70] h-0.5 bg-accent-main ${
                        trackDropTarget.placement === "after" ? "bottom-0" : "top-0"
                      }`}
                    />
                  )}
                  <div
                    className={[
                      "sticky left-0 z-20 flex w-[248px] shrink-0 items-center gap-2 border-r border-divider-main px-2 transition",
                      active ? "bg-accent-main/15" : "bg-[#121818] hover:bg-white/[0.03]",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      draggable
                      aria-label={`Drag ${track.object?.name || "track"} to reorder`}
                      title="Drag track up or down"
                      onDragStart={(event) => beginTrackDrag(event, track.id)}
                      onDragEnd={endTrackDrag}
                      onClick={(event) => event.stopPropagation()}
                      className="grid size-6 shrink-0 cursor-grab place-items-center rounded-md text-contrast-grayout transition hover:bg-white/5 hover:text-white active:cursor-grabbing"
                    >
                      <MaterialIcon name="drag_indicator" className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => animationAuthoring?.setActiveTrackId?.(track.id)}
                      className={`flex min-w-0 flex-1 items-center gap-2 text-left ${indentClass}`}
                    >
                      <span
                        className={[
                          "grid size-6 shrink-0 place-items-center rounded-md border text-[10px] font-semibold",
                          active
                            ? "border-accent-main bg-accent-main text-white"
                            : "border-divider-main text-contrast-grayout",
                        ].join(" ")}
                      >
                        {trackIndex + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-semibold text-white">
                          {track.object?.name || "Unnamed Object"}
                        </span>
                        <span className="flex items-center gap-1.5 text-[9px] text-contrast-grayout">
                          <span>{keyframes.length} keyframe(s)</span>
                          <span className="rounded border border-divider-main px-1 py-px text-[8px] text-secondary-default">
                            {getRigLabel(track)}
                          </span>
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      title="Delete track"
                      onClick={() => animationAuthoring?.deleteTrack?.(track.id)}
                      className="grid size-7 shrink-0 place-items-center rounded-md text-contrast-grayout transition hover:bg-red-500/10 hover:text-red-300"
                    >
                      <MaterialIcon name="delete" className="size-3.5" />
                    </button>
                  </div>

                  <div
                    className={[
                      "relative h-11 shrink-0 cursor-crosshair select-none",
                      active ? "bg-accent-main/[0.035]" : "bg-transparent",
                    ].join(" ")}
                    style={{ width: timelineWidth }}
                    onPointerDown={(event) => {
                      animationAuthoring?.setActiveTrackId?.(track.id);
                      scrubFromPointer(event);
                    }}
                  >
                    {ticks.map((tick) => (
                      <div
                        key={tick.time}
                        className="pointer-events-none absolute inset-y-0 border-l border-divider-main/30"
                        style={{ left: tick.time * pixelsPerSecond }}
                      />
                    ))}

                    {keyframes.map((keyframe) => {
                      const draggedTime =
                        draggingKeyframe?.id === keyframe.id
                          ? draggingKeyframe.time
                          : Number(keyframe.time) || 0;
                      const selected =
                        active && keyframe.id === animationAuthoring?.selectedKeyframeId;

                      return (
                        <button
                          key={keyframe.id}
                          type="button"
                          title={`${track.object?.name || "Track"} · ${formatTime(draggedTime)}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            animationAuthoring?.setActiveTrackId?.(track.id);
                            animationAuthoring?.setSelectedKeyframeId?.(keyframe.id);
                            animationAuthoring?.scrubTo?.(keyframe.time);
                          }}
                          onPointerDown={(event) => beginKeyframeDrag(event, track, keyframe)}
                          className={[
                            "absolute top-1/2 z-20 size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border transition",
                            selected
                              ? "border-white bg-accent-main ring-2 ring-accent-main/35"
                              : "border-secondary-default bg-[#243333] hover:bg-secondary-default",
                            draggingKeyframe?.id === keyframe.id ? "scale-125" : "",
                          ].join(" ")}
                          style={{ left: draggedTime * pixelsPerSecond }}
                        />
                      );
                    })}

                    <div
                      className="pointer-events-none absolute inset-y-0 z-10 w-px bg-accent-main"
                      style={{ left: playheadLeft }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
