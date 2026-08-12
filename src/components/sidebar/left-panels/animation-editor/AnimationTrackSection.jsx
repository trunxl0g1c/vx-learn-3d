import MaterialIcon from "../../../ui/material-icon";
import Button from "../../../ui/button";

const TRANSFORM_MODES = [
  { id: "translate", label: "Move", icon: "open_with" },
  { id: "rotate", label: "Rotate", icon: "360" },
  { id: "scale", label: "Scale", icon: "aspect_ratio" },
];

export default function AnimationTrackSection({
  animationAuthoring,
  selectedObjectName,
}) {
  const animation = animationAuthoring?.activeAnimation;
  const tracks = animation?.tracks || [];
  const activeTrack = animationAuthoring?.activeTrack;

  return (
    <section className="rounded-xl border border-secondary-default/60 bg-[#171b1b] p-4">
      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-7 place-items-center rounded-full bg-accent-main text-xs font-bold text-white">
          3
        </span>
        <h3 className="text-sm font-semibold text-white">Object Tracks</h3>
      </div>

      <div className="rounded-lg border border-divider-main bg-primary/40 p-3">
        <p className="text-[11px] uppercase tracking-wide text-contrast-grayout">
          Selected viewport object
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-white">
          {selectedObjectName || "No object selected"}
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-3 w-full"
          disabled={!selectedObjectName}
          onClick={animationAuthoring?.addTrackFromSelectedObject}
        >
          <MaterialIcon name="add" className="size-4" />
          Add Selected Object Track
        </Button>
      </div>

      {tracks.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-divider-main p-3 text-xs leading-5 text-contrast-grayout">
          Add one or more logical objects. Multi-material primitives remain one
          animation track.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {tracks.map((track, index) => {
            const active = track.id === animationAuthoring?.activeTrackId;
            return (
              <div
                key={track.id}
                className={[
                  "flex items-center gap-2 rounded-lg border p-2 transition",
                  active
                    ? "border-accent-main bg-accent-main/10"
                    : "border-divider-main bg-primary/40",
                ].join(" ")}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => animationAuthoring?.setActiveTrackId?.(track.id)}
                >
                  <span className="block truncate text-xs font-semibold text-white">
                    {index + 1}. {track.object?.name || "Unnamed Object"}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-contrast-grayout">
                    {track.keyframes?.length || 0} keyframe(s)
                  </span>
                </button>
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-lg text-contrast-grayout transition hover:bg-white/10 hover:text-white"
                  title="Delete track"
                  onClick={() => animationAuthoring?.deleteTrack?.(track.id)}
                >
                  <MaterialIcon name="delete" className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {activeTrack && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs text-contrast-grayout">Transform Gizmo</span>
            <span className="truncate text-[11px] text-secondary-default">
              {activeTrack.object?.name}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TRANSFORM_MODES.map((mode) => (
              <Button
                key={mode.id}
                type="button"
                size="xs"
                variant={
                  animationAuthoring?.transformMode === mode.id
                    ? "default"
                    : "darkOutline"
                }
                onClick={() => animationAuthoring?.setTransformMode?.(mode.id)}
              >
                <MaterialIcon name={mode.icon} className="size-4" />
                {mode.label}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-contrast-grayout">
            Gizmo uses local space. Move the object at the current timeline
            position, then save/update the keyframe.
          </p>
        </div>
      )}
    </section>
  );
}
