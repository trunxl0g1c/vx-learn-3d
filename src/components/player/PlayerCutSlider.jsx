import { useState } from "react";

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

function AxisCutSlider({ axis, value, range, onChange }) {
  const percent = getAxisPercent(axis, value, range);

  return (
    <div className="space-y-2" onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-accent-main">{AXIS_LABELS[axis]}</span>
        <span className="text-secondary-default">{percent}%</span>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={percent}
        onChange={(event) => {
          if (typeof onChange !== "function") return;
          onChange(axis, getValueFromPercent(event.target.value, range));
        }}
        className="vx-cut-axis-range w-full"
      />
    </div>
  );
}

export default function PlayerCutSlider({
  cutValues,
  cutRanges,
  updateCutValue,
  resetCutValues,
  onClose,
}) {
  const PANEL_WIDTH = 390;
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
    setDragging(true);
    setOffset({
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    });
  };

  const onDrag = (event) => {
    if (!dragging) return;

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
        className="absolute rounded-[22px] border border-divider-main bg-primary/85 p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl backdrop-saturate-150"
        style={{
          width: PANEL_WIDTH,
          left: position.x,
          top: position.y,
          cursor: dragging ? "grabbing" : "grab",
          pointerEvents: "auto",
          userSelect: "none",
        }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Cut Off</h3>
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => {
              if (typeof onClose === "function") onClose();
            }}
            className="grid size-9 place-items-center rounded-full text-3xl leading-none text-white/90 transition hover:bg-white/10"
            aria-label="Close cut off panel"
          >
            ×
          </button>
        </div>

        <div className="space-y-5">
          {[
            "x",
            "y",
            "z",
          ].map((axis) => (
            <AxisCutSlider
              key={axis}
              axis={axis}
              value={cutValues?.[axis]}
              range={cutRanges?.[axis]}
              onChange={updateCutValue}
            />
          ))}
        </div>

        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => {
            if (typeof resetCutValues === "function") resetCutValues();
          }}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#c8aa4a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c8aa4a]/10"
        >
          <span className="text-2xl leading-none text-accent-main">↻</span>
          Reset
        </button>
      </div>
    </div>
  );
}
