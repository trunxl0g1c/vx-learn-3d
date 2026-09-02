import MaterialIcon from "../ui/material-icon";
import Checkbox from "../ui/checkbox";
import Button from "../ui/button";

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
        className="w-11 bg-transparent text-right font-mono text-[10px] text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {suffix && (
        <span className="text-[8px] text-contrast-grayout">{suffix}</span>
      )}
    </label>
  );
}

function ReferenceChip({ label, reference, onAssign, selectedObjectName }) {
  return (
    <div className="flex h-8 min-w-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2">
      <span className="text-[9px] uppercase tracking-wide text-contrast-grayout">
        {label}
      </span>
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
          title={
            selectedObjectName
              ? `Use ${selectedObjectName}`
              : "Select an object in the viewport"
          }
          className="ml-1 grid size-6 shrink-0 cursor-pointer place-items-center rounded-md border border-divider-main text-secondary-default transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <MaterialIcon name="my_location" size={200} />
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
    <div className="flex h-10 shrink-0 items-center gap-3 rounded-lg border border-divider-main bg-primary/70 px-2">
      <span className="mr-1 text-[9px] uppercase tracking-wide text-contrast-grayout">
        {label}
      </span>
      {onAssignSelected && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={!selectedObjectName}
          onClick={onAssignSelected}
          title={
            selectedObjectName
              ? `Use ${selectedObjectName} as ${label.toLowerCase()}`
              : "Select an object in the viewport"
          }
        >
          <MaterialIcon name="my_location" size={15} />
        </Button>
      )}
      <Button
        type="button"
        size="icon"
        disabled={!canDrag}
        onClick={onToggleDrag}
        title={
          active
            ? `Finish ${label.toLowerCase()} drag mode`
            : `Drag ${label.toLowerCase()} in viewport`
        }
        variant={active ? "default" : "outline"}
      >
        {active ? (
          <MaterialIcon name="pan_tool_alt" size={15} />
        ) : (
          <MaterialIcon name="pan_tool" size={15} />
        )}
      </Button>
      {active && (
        <label
          className="flex h-6 items-center gap-1 rounded-md border border-divider-main px-1.5"
          title={`Click a mesh in the viewport to snap the ${label.toLowerCase()}`}
        >
          <span className="text-[9px] uppercase tracking-wide text-contrast-grayout">
            Snap
          </span>
          <select
            value={snapMode}
            onChange={(event) => onSnapModeChange?.(event.target.value)}
            className="cursor-pointer bg-transparent text-xs text-white outline-none"
          >
            <option value="surface" className="bg-primary">
              Surface
            </option>
            <option value="vertex" className="bg-primary">
              Vertex
            </option>
          </select>
        </label>
      )}
      {AXES.map((axis, index) => (
        <label key={axis} className="flex items-center justify-center gap-1">
          <span className="text-[9px] uppercase text-contrast-grayout">
            {axis}
          </span>
          <input
            type="number"
            step="0.01"
            value={Number(values[index] || 0)}
            onChange={(event) => {
              const next = [...values];
              next[index] = Number(event.target.value) || 0;
              onPointChange?.(next);
            }}
            className="w-11 bg-transparent text-right text-xs text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
  const otherTracks = (animation.tracks || []).filter(
    (item) => item.id !== track.id,
  );
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
    <div className="flex h-14 shrink-0 items-center gap-2 overflow-x-auto border-b border-divider-main bg-[#101717] px-3 scrollbar-thin">
      <div className="flex shrink-0 items-center gap-1.5 text-sm font-normal text-accent-main">
        <MaterialIcon name="account_tree" size={20} />
        Animation Rig
      </div>

      <select
        value={type}
        onChange={(event) =>
          animationAuthoring?.setActiveTrackRigType?.(event.target.value)
        }
        className="cursor-pointer h-8 w-36 shrink-0 rounded-lg border border-secondary-default/50 bg-primary px-2 text-xs text-white outline-none"
      >
        {RIG_TYPES.map((item) => (
          <option key={item.id} value={item.id} className="bg-primary">
            {item.label}
          </option>
        ))}
      </select>

      <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2">
        <span className="text-[9px] uppercase tracking-wide text-contrast-grayout">
          Parent
        </span>
        <select
          value={rig.parentTrackId || ""}
          onChange={(event) =>
            animationAuthoring?.setActiveTrackRigParent?.(
              event.target.value || null,
            )
          }
          className="cursor-pointer max-w-32 bg-transparent text-xs text-white outline-none"
        >
          <option value="" className="bg-primary">
            None
          </option>
          {otherTracks.map((item) => (
            <option key={item.id} value={item.id} className="bg-primary">
              {item.object?.name || "Unnamed Track"}
            </option>
          ))}
        </select>
      </label>

      {["revolute", "linear", "hydraulic"].includes(type) && (
        <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2">
          <span className="text-[9px] uppercase tracking-wide text-contrast-grayout">
            Axis
          </span>
          <select
            value={rig.axis || "y"}
            onChange={(event) =>
              animationAuthoring?.updateActiveTrackRig?.({
                axis: event.target.value,
              })
            }
            className="cursor-pointer bg-transparent text-[10px] uppercase text-white outline-none"
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
          onAssignSelected={
            animationAuthoring?.assignRigPivotFromSelectedObject
          }
          selectedObjectName={selectedObjectName}
          {...sharedPointProps}
        />
      )}

      {(type === "revolute" || type === "linear") && (
        <div className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2">
          <label className="flex items-center gap-1.5 text-[9px] text-white">
            <Checkbox
              checked={limits.enabled === true}
              onCheckedChange={(checked) =>
                animationAuthoring?.updateActiveTrackRig?.({
                  limits: { enabled: checked },
                })
              }
            />
            Limit
          </label>
          <NumberField
            value={limits.min}
            onChange={(value) =>
              animationAuthoring?.updateActiveTrackRig?.({
                limits: { min: value },
              })
            }
            suffix={type === "revolute" ? "°" : ""}
          />
          <span className="text-[8px] text-contrast-grayout">to</span>
          <NumberField
            value={limits.max}
            onChange={(value) =>
              animationAuthoring?.updateActiveTrackRig?.({
                limits: { max: value },
              })
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
            <span className="text-[9px] uppercase tracking-wide text-contrast-grayout">
              Mode
            </span>
            <select
              value={morph.mode || "auto"}
              onChange={(event) =>
                animationAuthoring?.updateActiveTrackRig?.({
                  morph: { mode: event.target.value },
                })
              }
              className="cursor-pointer bg-transparent text-[10px] text-white outline-none"
            >
              <option value="auto" className="bg-primary">
                Auto
              </option>
              <option value="true" className="bg-primary">
                True Morph
              </option>
              <option value="cross" className="bg-primary">
                Cross Fade
              </option>
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
              name={
                morphCompatibility?.compatible ? "check_circle" : "swap_horiz"
              }
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
            <Checkbox
              checked={morph.hideSourceWhenComplete !== false}
              onCheckedChange={(checked) =>
                animationAuthoring?.updateActiveTrackRig?.({
                  morph: { hideSourceWhenComplete: checked },
                })
              }
            />
            Swap at 100%
          </label>
          <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2 text-[9px] text-white">
            <Checkbox
              checked={morph.hideTargetWhenStart !== false}
              onCheckedChange={(checked) =>
                animationAuthoring?.updateActiveTrackRig?.({
                  morph: { hideTargetWhenStart: checked },
                })
              }
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
              animationAuthoring?.assignRigReferenceFromSelectedObject?.(
                "baseObject",
              )
            }
          />
          <RigPointControl
            label="Base Anchor"
            point={hydraulic.baseAnchor}
            active={pointEditorActive && pointEditorTarget === "baseAnchor"}
            canDrag={Boolean(hydraulic.baseObject)}
            onToggleDrag={() =>
              animationAuthoring?.toggleHydraulicAnchorEditing?.("baseAnchor")
            }
            onPointChange={(value) =>
              updateHydraulicAnchor("baseAnchor", value)
            }
            {...sharedPointProps}
          />
          <ReferenceChip
            label="Target"
            reference={hydraulic.targetObject}
            selectedObjectName={selectedObjectName}
            onAssign={() =>
              animationAuthoring?.assignRigReferenceFromSelectedObject?.(
                "targetObject",
              )
            }
          />
          <RigPointControl
            label="Target Anchor"
            point={hydraulic.targetAnchor}
            active={pointEditorActive && pointEditorTarget === "targetAnchor"}
            canDrag={Boolean(hydraulic.targetObject)}
            onToggleDrag={() =>
              animationAuthoring?.toggleHydraulicAnchorEditing?.("targetAnchor")
            }
            onPointChange={(value) =>
              updateHydraulicAnchor("targetAnchor", value)
            }
            {...sharedPointProps}
          />
          <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2 text-[9px] text-white">
            <Checkbox
              checked={hydraulic.anchorToBase !== false}
              onCheckedChange={(checked) =>
                animationAuthoring?.updateActiveTrackRig?.({
                  hydraulic: { anchorToBase: checked },
                })
              }
            />
            Anchor Base
          </label>
          <label className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-divider-main bg-primary/70 px-2 text-[9px] text-white">
            <Checkbox
              checked={hydraulic.stretch !== false}
              onCheckedChange={(checked) =>
                animationAuthoring?.updateActiveTrackRig?.({
                  hydraulic: { stretch: checked },
                })
              }
            />
            Auto Stretch
          </label>
        </>
      )}

      <Button
        size="xs"
        type="button"
        onClick={animationAuthoring?.captureActiveTrackRigBase}
        title="Use current object transform as the neutral rig pose"
        className="ml-auto"
      >
        <MaterialIcon name="adjust" size={20} />
        Set Neutral Pose
      </Button>
    </div>
  );
}
