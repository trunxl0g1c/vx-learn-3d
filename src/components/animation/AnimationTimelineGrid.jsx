import { useMemo, useState } from "react";
import MaterialIcon from "../ui/material-icon";

const DEFAULT_TRACK_COLUMN_WIDTH = 248;
const MIN_TRACK_COLUMN_WIDTH = 160;
const MAX_TRACK_COLUMN_WIDTH = 420;
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
  const [trackColumnWidth, setTrackColumnWidth] = useState(
    DEFAULT_TRACK_COLUMN_WIDTH,
  );

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
          <MaterialIcon name="animation" size={30} className="mx-auto text-secondary-default" />
          <p className="mt-2 text-lg font-normal text-white">No animation selected</p>
          <p className="mt-1 text-xs text-contrast-grayout">
            Create or select an animation from the toolbar above.
          </p>
        </div>
      </div>
    );
  }

  const timeFromPointer = (clientX, rect) =>
    clamp((clientX - rect.left) / pixelsPerSecond, 0, duration);

  const beginScrubDrag = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    const scrub = (clientX) => {
      animationAuthoring?.scrubTo?.(timeFromPointer(clientX, rect));
    };

    const handleMove = (moveEvent) => {
      scrub(moveEvent.clientX);
    };

    const finishDrag = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      window.removeEventListener("blur", finishDrag);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
    };

    scrub(event.clientX);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", finishDrag, { once: true });
    window.addEventListener("pointercancel", finishDrag, { once: true });
    window.addEventListener("blur", finishDrag, { once: true });
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

  const beginColumnResize = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();

    const startX = event.clientX;
    const startWidth = trackColumnWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMove = (moveEvent) => {
      setTrackColumnWidth(
        clamp(
          startWidth + (moveEvent.clientX - startX),
          MIN_TRACK_COLUMN_WIDTH,
          MAX_TRACK_COLUMN_WIDTH,
        ),
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
      <div className="flex h-7 shrink-0 items-center gap-1.5 border-b border-divider-main bg-[#151c1c] px-3">
        <span className="font-mono text-sm font-semibold text-accent-main">
          {formatTime(animationAuthoring?.currentTime)}
        </span>
        <span className="text-[10px] text-contrast-grayout">
          / {formatTime(duration)}
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        <div className="h-full min-h-0 overflow-auto overscroll-contain">
          <div
            className="relative min-h-full"
            style={{ minWidth: trackColumnWidth + timelineWidth }}
          >
            <div className="sticky top-0 z-40 flex h-6 border-b border-divider-main bg-[#141a1a]">
              <div
                className="sticky left-0 z-50 flex shrink-0 items-center border-r border-divider-main bg-[#141a1a] px-2 text-xs font-normal uppercase tracking-widest text-contrast-grayout"
                style={{ width: trackColumnWidth }}
              >
                Object / Track
              </div>
              <div
                className="relative h-6 shrink-0 cursor-ew-resize touch-none select-none"
                style={{ width: timelineWidth }}
                onPointerDown={beginScrubDrag}
              >
                {ticks.map((tick) => (
                  <div
                    key={tick.time}
                    className="absolute inset-y-0 border-l border-divider-main/80"
                    style={{ left: tick.time * pixelsPerSecond }}
                  >
                    <span className="absolute left-1 top-0.5 whitespace-nowrap text-[10px] text-contrast-grayout">
                      {tick.label}
                    </span>
                  </div>
                ))}
                <div
                  className="pointer-events-none absolute bottom-0 left-0 h-1 bg-accent-main/50"
                  style={{ width: duration * pixelsPerSecond }}
                />
                <div
                  className="pointer-events-none absolute inset-y-0 z-30 w-px bg-accent-main"
                  style={{ left: playheadLeft }}
                >
                  <div className="absolute left-1/2 top-0 h-2.5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-xs bg-accent-main" />
                </div>
              </div>
            </div>

            {tracks.length === 0 ? (
              <div className="flex h-20 items-center border-b border-divider-main/70">
                <div
                  className="sticky left-0 z-20 flex h-full shrink-0 items-center border-r border-divider-main bg-[#121818] px-3 text-xs text-contrast-grayout"
                  style={{ width: trackColumnWidth }}
                >
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
                const rowShade = trackIndex % 2 === 1 ? "bg-[#151b1b]" : "bg-[#121818]";

                return (
                  <div
                    key={track.id}
                    onDragOver={(event) => updateTrackDropTarget(event, track.id)}
                    onDrop={(event) => dropTrack(event, track.id)}
                    className={[
                      "relative flex h-9 border-b border-divider-main/70 transition-opacity",
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
                        "sticky left-0 z-20 flex shrink-0 items-center gap-1.5 border-r border-divider-main px-2 transition",
                        active ? "bg-accent-main/15" : `${rowShade} hover:bg-white/[0.03]`,
                      ].join(" ")}
                      style={{ width: trackColumnWidth }}
                    >
                      <button
                        type="button"
                        draggable
                        aria-label={`Drag ${track.object?.name || "track"} to reorder`}
                        title="Drag track up or down"
                        onDragStart={(event) => beginTrackDrag(event, track.id)}
                        onDragEnd={endTrackDrag}
                        onClick={(event) => event.stopPropagation()}
                        className="grid size-5 shrink-0 cursor-grab place-items-center rounded-md text-contrast-grayout transition hover:bg-white/5 hover:text-white active:cursor-grabbing"
                      >
                        <MaterialIcon name="drag_indicator" size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() => animationAuthoring?.setActiveTrackId?.(track.id)}
                        className={`flex min-w-0 flex-1 items-center gap-1.5 text-left ${indentClass}`}
                      >
                        <span
                          className={[
                            "grid size-5 shrink-0 place-items-center rounded-md border text-[9px] font-normal",
                            active
                              ? "border-accent-main bg-accent-main text-white"
                              : "border-divider-main text-contrast-grayout",
                          ].join(" ")}
                        >
                          {trackIndex + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-normal text-white">
                            {track.object?.name || "Unnamed Object"}
                          </span>
                          <span className="flex items-center gap-1.5 text-[10px] text-contrast-grayout">
                            <span>{keyframes.length} keyframe(s)</span>
                            <span className="rounded border border-divider-main px-1 py-px text-[7px] text-secondary-default">
                              {getRigLabel(track)}
                            </span>
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Delete track"
                        onClick={() => animationAuthoring?.deleteTrack?.(track.id)}
                        className="cursor-pointer grid size-6 shrink-0 place-items-center rounded-md text-contrast-grayout transition hover:bg-red-500/10 hover:text-red-300"
                      >
                        <MaterialIcon name="delete" size={20} />
                      </button>
                    </div>

                    <div
                      className={[
                        "relative h-9 shrink-0 cursor-ew-resize touch-none select-none",
                        active ? "bg-accent-main/[0.035]" : rowShade,
                      ].join(" ")}
                      style={{ width: timelineWidth }}
                      onPointerDown={(event) => {
                        animationAuthoring?.setActiveTrackId?.(track.id);
                        beginScrubDrag(event);
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
                              "absolute top-1/2 z-20 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border transition",
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

        <div
          onPointerDown={beginColumnResize}
          title="Drag to resize the track panel"
          className="group absolute inset-y-0 z-80 w-2 -translate-x-1/2 cursor-col-resize touch-none"
          style={{ left: trackColumnWidth }}
        >
          <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover:w-0.5 group-hover:bg-accent-main" />
        </div>
      </div>

      <div className="flex h-6 shrink-0 items-center justify-between border-t border-divider-main bg-[#151c1c] px-2">
        <div className="flex items-center gap-1.5 text-[9px] text-contrast-grayout">
          <MaterialIcon name="timeline" size={14} className="text-secondary-default" />
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
            className="grid size-5 place-items-center rounded text-contrast-grayout transition hover:bg-white/5 hover:text-white disabled:opacity-30"
          >
            <MaterialIcon name="remove" className="size-3.5" />
          </button>
          <span className="w-9 text-center text-[9px] text-contrast-grayout">
            {Math.round((pixelsPerSecond / ZOOM_LEVELS[2]) * 100)}%
          </span>
          <button
            type="button"
            title="Zoom in timeline"
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            onClick={() =>
              setZoomIndex((current) => Math.min(ZOOM_LEVELS.length - 1, current + 1))
            }
            className="grid size-5 place-items-center rounded text-contrast-grayout transition hover:bg-white/5 hover:text-white disabled:opacity-30"
          >
            <MaterialIcon name="add" className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
