import MaterialIcon from "../ui/material-icon";

const RIG_TYPES = [
  { id: "free", label: "Free Transform" },
  { id: "revolute", label: "Revolute Joint" },
  { id: "linear", label: "Linear Joint" },
  { id: "hydraulic", label: "Hydraulic / Aim" },
  { id: "morph", label: "Morph" },
];

const AXES = ["x", "y", "z"];

function NumberField({ value, onChange, step = "0.01", suffix = "" }) {
  return (
    <label className="flex h-7 items-center gap-1 rounded-md border border-divider-main bg-primary/70 px-1.5">
      <input
        type="number"
        step={step}
        value={Number(value || 0)}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="w-14 bg-transparent text-right font-mono text-[9px] text-white outline-none"
      />
      {suffix && <span className="text-[8px] text-contrast-grayout">{suffix}</span>}
    </label>
  );
}

function ReferenceChip({ label, reference, onAssign, selectedObjectName }) {
  return (
    <div className="flex h-8 min-w-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2">
      <span className="text-[9px] uppercase tracking-wide text-contrast-grayout">{label}</span>
      <span
        className="max-w-28 truncate text-[10px] text-white"
        title={reference?.name || "Not assigned"}
      >
        {reference?.name || "Not assigned"}
      </span>
      {onAssign && (
        <button
          type="button"
          disabled={!selectedObjectName}
          onClick={onAssign}
          title={selectedObjectName ? `Use ${selectedObjectName}` : "Select an object in the viewport"}
          className="ml-1 grid size-6 shrink-0 place-items-center rounded-md border border-divider-main text-secondary-default transition hover:bg-white/5 disabled:opacity-30"
        >
          <MaterialIcon name="my_location" className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function RigPointControl({
  label,
  point,
  active,
  canDrag = true,
  onToggleDrag,
  onPointChange,
  onAssignSelected = null,
  selectedObjectName = "",
  snapMode = "surface",
  onSnapModeChange,
}) {
  const values = Array.isArray(point) ? point : [0, 0, 0];

  return (
    <div className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-divider-main bg-primary/70 px-2">
      <span className="mr-1 text-[9px] uppercase tracking-wide text-contrast-grayout">
        {label}
      </span>
      {onAssignSelected && (
        <button
          type="button"
          disabled={!selectedObjectName}
          onClick={onAssignSelected}
          title={selectedObjectName ? `Use ${selectedObjectName} as ${label.toLowerCase()}` : "Select an object in the viewport"}
          className="grid size-6 shrink-0 place-items-center rounded-md border border-divider-main text-secondary-default transition hover:bg-white/5 disabled:opacity-30"
        >
          <MaterialIcon name="my_location" className="size-3.5" />
        </button>
      )}
      <button
        type="button"
        disabled={!canDrag}
        onClick={onToggleDrag}
        title={active ? `Finish ${label.toLowerCase()} drag mode` : `Drag ${label.toLowerCase()} in viewport`}
        className={`grid h-6 min-w-[38px] shrink-0 place-items-center rounded-md border px-1.5 text-[8px] font-semibold uppercase tracking-wide transition disabled:opacity-30 ${
          active
            ? "border-accent-main bg-accent-main/20 text-white"
            : "border-divider-main text-secondary-default hover:bg-white/5"
        }`}
      >
        {active ? "Done" : "Drag"}
      </button>
      {active && (
        <label
          className="flex h-6 items-center gap-1 rounded-md border border-divider-main px-1.5"
          title={`Click a mesh in the viewport to snap the ${label.toLowerCase()}`}
        >
          <span className="text-[8px] uppercase tracking-wide text-contrast-grayout">Snap</span>
          <select
            value={snapMode}
            onChange={(event) => onSnapModeChange?.(event.target.value)}
            className="bg-transparent text-[8px] text-white outline-none"
          >
            <option value="surface" className="bg-primary">Surface</option>
            <option value="vertex" className="bg-primary">Vertex</option>
          </select>
        </label>
      )}
      {AXES.map((axis, index) => (
        <label key={axis} className="flex items-center gap-1">
          <span className="text-[8px] uppercase text-contrast-grayout">{axis}</span>
          <input
            type="number"
            step="0.01"
            value={Number(values[index] || 0)}
            onChange={(event) => {
              const next = [...values];
              next[index] = Number(event.target.value) || 0;
              onPointChange?.(next);
            }}
            className="w-11 bg-transparent text-right font-mono text-[9px] text-white outline-none"
          />
        </label>
      ))}
    </div>
  );
}

export default function AnimationRigToolbar({
  animationAuthoring,
  selectedObjectName,
}) {
  const animation = animationAuthoring?.activeAnimation;
  const track = animationAuthoring?.activeTrack;
  if (!animation || !track) return null;

  const rig = track.rig || {};
  const type = rig.type || "free";
  const limits = rig.limits || {};
  const hydraulic = rig.hydraulic || {};
  const morph = rig.morph || {};
  const morphCompatibility = animationAuthoring?.activeMorphCompatibility;
  const otherTracks = (animation.tracks || []).filter((item) => item.id !== track.id);
  const pointEditorActive = animationAuthoring?.isPivotEditing === true;
  const pointEditorTarget = animationAuthoring?.rigPointEditTarget || "pivot";
  const sharedPointProps = {
    snapMode: animationAuthoring?.pivotSnapMode || "surface",
    onSnapModeChange: animationAuthoring?.setPivotSnapMode,
  };

  const updateHydraulicAnchor = (field, value) => {
    animationAuthoring?.updateActiveTrackRig?.((currentRig) => ({
      hydraulic: {
        ...(currentRig?.hydraulic || {}),
        [field]: value,
      },
    }));
  };

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 overflow-x-auto border-b border-divider-main bg-[#101717] px-3 scrollbar-thin">
      <div className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold text-secondary-default">
        <MaterialIcon name="account_tree" className="size-4" />
        Animation Rig
      </div>

      <select
        value={type}
        onChange={(event) => animationAuthoring?.setActiveTrackRigType?.(event.target.value)}
        className="h-8 w-36 shrink-0 rounded-lg border border-secondary-default/50 bg-primary px-2 text-[10px] text-white outline-none"
      >
        {RIG_TYPES.map((item) => (
          <option key={item.id} value={item.id} className="bg-primary">
            {item.label}
          </option>
        ))}
      </select>

      <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2">
        <span className="text-[9px] uppercase tracking-wide text-contrast-grayout">Parent</span>
        <select
          value={rig.parentTrackId || ""}
          onChange={(event) => animationAuthoring?.setActiveTrackRigParent?.(event.target.value || null)}
          className="max-w-32 bg-transparent text-[10px] text-white outline-none"
        >
          <option value="" className="bg-primary">None</option>
          {otherTracks.map((item) => (
            <option key={item.id} value={item.id} className="bg-primary">
              {item.object?.name || "Unnamed Track"}
            </option>
          ))}
        </select>
      </label>

      {["revolute", "linear", "hydraulic"].includes(type) && (
        <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2">
          <span className="text-[9px] uppercase tracking-wide text-contrast-grayout">Axis</span>
          <select
            value={rig.axis || "y"}
            onChange={(event) => animationAuthoring?.updateActiveTrackRig?.({ axis: event.target.value })}
            className="bg-transparent text-[10px] uppercase text-white outline-none"
          >
            {AXES.map((axis) => (
              <option key={axis} value={axis} className="bg-primary">
                {axis.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      )}

      {["free", "revolute", "linear"].includes(type) && (
        <RigPointControl
          label={type === "linear" ? "Origin" : "Pivot"}
          point={rig.pivot}
          active={pointEditorActive && pointEditorTarget === "pivot"}
          onToggleDrag={() => animationAuthoring?.togglePivotEditing?.()}
          onPointChange={animationAuthoring?.setActiveTrackRigPivot}
          onAssignSelected={animationAuthoring?.assignRigPivotFromSelectedObject}
          selectedObjectName={selectedObjectName}
          {...sharedPointProps}
        />
      )}

      {(type === "revolute" || type === "linear") && (
        <div className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2">
          <label className="flex items-center gap-1.5 text-[9px] text-white">
            <input
              type="checkbox"
              checked={limits.enabled === true}
              onChange={(event) =>
                animationAuthoring?.updateActiveTrackRig?.({
                  limits: { enabled: event.target.checked },
                })
              }
              className="size-3.5 accent-accent-main"
            />
            Limit
          </label>
          <NumberField
            value={limits.min}
            onChange={(value) =>
              animationAuthoring?.updateActiveTrackRig?.({ limits: { min: value } })
            }
            suffix={type === "revolute" ? "°" : ""}
          />
          <span className="text-[8px] text-contrast-grayout">to</span>
          <NumberField
            value={limits.max}
            onChange={(value) =>
              animationAuthoring?.updateActiveTrackRig?.({ limits: { max: value } })
            }
            suffix={type === "revolute" ? "°" : ""}
          />
        </div>
      )}

      {type === "morph" && (
        <>
          <ReferenceChip label="Source" reference={track.object} />
          <ReferenceChip
            label="Target"
            reference={morph.targetObject}
            selectedObjectName={selectedObjectName}
            onAssign={animationAuthoring?.assignMorphTargetFromSelectedObject}
          />
          <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2">
            <span className="text-[9px] uppercase tracking-wide text-contrast-grayout">Mode</span>
            <select
              value={morph.mode || "auto"}
              onChange={(event) =>
                animationAuthoring?.updateActiveTrackRig?.({
                  morph: { mode: event.target.value },
                })
              }
              className="bg-transparent text-[10px] text-white outline-none"
            >
              <option value="auto" className="bg-primary">Auto</option>
              <option value="true" className="bg-primary">True Morph</option>
              <option value="cross" className="bg-primary">Cross Fade</option>
            </select>
          </label>
          <div
            title={morphCompatibility?.reason || "Assign a target object"}
            className={[
              "flex h-8 max-w-52 shrink-0 items-center gap-1.5 truncate rounded-lg border px-2 text-[9px]",
              morphCompatibility?.compatible
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-amber-500/40 bg-amber-500/10 text-amber-200",
            ].join(" ")}
          >
            <MaterialIcon
              name={morphCompatibility?.compatible ? "check_circle" : "swap_horiz"}
              className="size-3.5 shrink-0"
            />
            <span className="truncate">
              {morph.mode === "cross" && morph.targetObject
                ? "Cross Fade selected"
                : morphCompatibility?.compatible
                  ? `True Morph · ${morphCompatibility.meshCount || 0} mesh`
                  : morph.targetObject
                    ? `Cross Fade · ${morphCompatibility?.reason || "different topology"}`
                    : "Assign Target"}
            </span>
          </div>
          <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2 text-[9px] text-white">
            <input
              type="checkbox"
              checked={morph.hideSourceWhenComplete !== false}
              onChange={(event) =>
                animationAuthoring?.updateActiveTrackRig?.({
                  morph: { hideSourceWhenComplete: event.target.checked },
                })
              }
              className="size-3.5 accent-accent-main"
            />
            Swap at 100%
          </label>
          <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2 text-[9px] text-white">
            <input
              type="checkbox"
              checked={morph.hideTargetWhenStart !== false}
              onChange={(event) =>
                animationAuthoring?.updateActiveTrackRig?.({
                  morph: { hideTargetWhenStart: event.target.checked },
                })
              }
              className="size-3.5 accent-accent-main"
            />
            Hide Target at 0%
          </label>
        </>
      )}

      {type === "hydraulic" && (
        <>
          <ReferenceChip
            label="Base"
            reference={hydraulic.baseObject}
            selectedObjectName={selectedObjectName}
            onAssign={() =>
              animationAuthoring?.assignRigReferenceFromSelectedObject?.("baseObject")
            }
          />
          <RigPointControl
            label="Base Anchor"
            point={hydraulic.baseAnchor}
            active={pointEditorActive && pointEditorTarget === "baseAnchor"}
            canDrag={Boolean(hydraulic.baseObject)}
            onToggleDrag={() => animationAuthoring?.toggleHydraulicAnchorEditing?.("baseAnchor")}
            onPointChange={(value) => updateHydraulicAnchor("baseAnchor", value)}
            {...sharedPointProps}
          />
          <ReferenceChip
            label="Target"
            reference={hydraulic.targetObject}
            selectedObjectName={selectedObjectName}
            onAssign={() =>
              animationAuthoring?.assignRigReferenceFromSelectedObject?.("targetObject")
            }
          />
          <RigPointControl
            label="Target Anchor"
            point={hydraulic.targetAnchor}
            active={pointEditorActive && pointEditorTarget === "targetAnchor"}
            canDrag={Boolean(hydraulic.targetObject)}
            onToggleDrag={() => animationAuthoring?.toggleHydraulicAnchorEditing?.("targetAnchor")}
            onPointChange={(value) => updateHydraulicAnchor("targetAnchor", value)}
            {...sharedPointProps}
          />
          <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2 text-[9px] text-white">
            <input
              type="checkbox"
              checked={hydraulic.anchorToBase !== false}
              onChange={(event) =>
                animationAuthoring?.updateActiveTrackRig?.({
                  hydraulic: { anchorToBase: event.target.checked },
                })
              }
              className="size-3.5 accent-accent-main"
            />
            Anchor Base
          </label>
          <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2 text-[9px] text-white">
            <input
              type="checkbox"
              checked={hydraulic.stretch !== false}
              onChange={(event) =>
                animationAuthoring?.updateActiveTrackRig?.({
                  hydraulic: { stretch: event.target.checked },
                })
              }
              className="size-3.5 accent-accent-main"
            />
            Auto Stretch
          </label>
        </>
      )}

      <button
        type="button"
        onClick={animationAuthoring?.captureActiveTrackRigBase}
        title="Use current object transform as the neutral rig pose"
        className="ml-auto flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main px-2.5 text-[9px] text-contrast-grayout transition hover:bg-white/5 hover:text-white"
      >
        <MaterialIcon name="adjust" className="size-3.5" />
        Set Neutral Pose
      </button>
    </div>
  );
}
