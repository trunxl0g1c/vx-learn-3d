import { useState } from "react";
import useResponsiveViewport from "../../hooks/useResponsiveViewport";
import Button from "../ui/button";
import { X } from "lucide-react";
import MaterialIcon from "../ui/material-icon";
import Switch from "../ui/switch";

const AXIS_LABELS = {
  x: "X Axis",
  y: "Y Axis",
  z: "Z Axis",
};

function getAxisPercent(axis, value, range) {
  const min = range?.min ?? -3;
  const max = range?.max ?? 3;
  const span = max - min;

  if (!span) return 0;

  return Math.round(((max - Number(value ?? max)) / span) * 100);
}

function getValueFromPercent(percent, range) {
  const min = range?.min ?? -3;
  const max = range?.max ?? 3;
  const clampedPercent = Math.max(0, Math.min(100, Number(percent) || 0));

  return max - ((max - min) * clampedPercent) / 100;
}

function AxisCutSlider({ axis, value, range, onChange, disabled = false }) {
  const percent = getAxisPercent(axis, value, range);

  return (
    <div className="space-y-1" onMouseDown={(event) => event.stopPropagation()}>
      <div className="flex items-center justify-between text-sm font-normal">
        <span className="text-secondary-default">{AXIS_LABELS[axis]}</span>

        <span className="text-sm text-grayout-main">{percent}%</span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={percent}
        disabled={disabled}
        onChange={(event) => {
          if (typeof onChange !== "function") return;

          const nextPercent = Number(event.target.value);
          const nextValue = getValueFromPercent(nextPercent, range);

          onChange(axis, nextValue);
        }}
        className="vx-cut-axis-range h-1 w-full cursor-pointer appearance-none rounded-full bg-transparent outline-none"
        style={{
          background: `linear-gradient(
            to right,
            var(--color-accent-main) 0%,
            var(--color-accent-main) ${percent}%,
            #5E6875 ${percent}%,
            #5E6875 100%
          )`,
        }}
      />
    </div>
  );
}

export default function CutSectionSlider({
  cutValues,
  cutRanges,
  updateCutValue,
  resetCutValues,
  cutAllObjects = true,
  setCutAllObjects,
  cutTargetAvailable = true,
  onClose,
}) {
  const PANEL_WIDTH = 390;
  const { isMobile, isTablet } = useResponsiveViewport();
  const dragDisabled = isMobile || isTablet;
  const [position, setPosition] = useState(() => ({
    x:
      typeof window !== "undefined"
        ? Math.max(72, window.innerWidth / 2 - PANEL_WIDTH / 2 - 260)
        : 120,
    y: typeof window !== "undefined" ? 110 : 120,
  }));
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const startDrag = (event) => {
    if (dragDisabled) return;
    setDragging(true);
    setOffset({
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    });
  };

  const onDrag = (event) => {
    if (dragDisabled || !dragging) return;

    setPosition({
      x: event.clientX - offset.x,
      y: event.clientY - offset.y,
    });
  };

  const stopDrag = () => {
    setDragging(false);
  };

  return (
    <div
      onMouseMove={onDrag}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      className="fixed inset-0 z-[200]"
      style={{ pointerEvents: dragging ? "auto" : "none" }}
    >
      <style>{`
        .vx-cut-axis-range {
          height: 4px;
          cursor: pointer;
          accent-color: #0ea5e9;
        }
      `}</style>

      <div
        onMouseDown={startDrag}
        className="vx-editor-cut-panel absolute rounded-2xl bg-[#182223B8] p-5 text-white backdrop-blur-md backdrop-saturate-150"
        style={{
          width: PANEL_WIDTH,
          left: position.x,
          top: position.y,
          cursor: dragDisabled ? "default" : dragging ? "grabbing" : "grab",
          pointerEvents: "auto",
          userSelect: "none",
        }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-normal text-white">Cut Off</h3>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => {
              if (typeof onClose === "function") onClose();
            }}
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white"
            title="Close cut off panel"
            aria-label="Close cut off panel"
          >
            <X className="size-6 text-secondary-default" />
          </button>
        </div>

        <div className="space-y-5">
          {["x", "y", "z"].map((axis) => (
            <AxisCutSlider
              key={axis}
              axis={axis}
              value={cutValues?.[axis]}
              range={cutRanges?.[axis]}
              onChange={updateCutValue}
              disabled={!cutTargetAvailable}
            />
          ))}
        </div>

        <div
          className="mt-5 flex items-center justify-between border-t border-white/10 pt-4"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div>
            <div className="text-sm font-medium text-secondary-default">
              Cut All Objects
            </div>
            {!cutAllObjects && !cutTargetAvailable && (
              <div className="mt-1 text-xs text-grayout-main">
                Select an object to apply Cut.
              </div>
            )}
          </div>

          <Switch
            checked={cutAllObjects}
            onCheckedChange={setCutAllObjects}
          />
        </div>

        <Button
          size="sm"
          type="button"
          variant="outline"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => {
            if (typeof resetCutValues === "function") resetCutValues();
          }}
          className="mt-5 border-grayout-dark!"
        >
          <MaterialIcon
            name="refresh"
            fill={1}
            size={25}
            className="text-secondary-default"
          />
          Reset
        </Button>
      </div>
    </div>
  );
}
