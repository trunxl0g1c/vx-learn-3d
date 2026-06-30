import { useState } from "react";

export default function PlayerCutSlider({
  cutAxis,
  setCutAxis,
  cutValue,
  cutMin,
  cutMax,
  setCutValue,
}) {
  const PANEL_WIDTH = 380;

  const [position, setPosition] = useState(() => ({
    x:
      typeof window !== "undefined"
        ? window.innerWidth / 2 - PANEL_WIDTH / 2-250
        : 300,
    y:
      typeof window !== "undefined"
        ? window.innerHeight - 305
        : 300,
  }));

  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const startDrag = (e) => {
    setDragging(true);
    setOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const onDrag = (e) => {
    if (!dragging) return;

    setPosition({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
  };

  return (
    <div
      onMouseMove={onDrag}
      onMouseUp={() => setDragging(false)}
      onMouseLeave={() => setDragging(false)}
      className="fixed inset-0 z-[200]"
      style={{ pointerEvents: dragging ? "auto" : "none" }}
    >
      <div
        onMouseDown={startDrag}
        className="absolute w-[380px] rounded-2xl border border-divider-main bg-primary/95 p-4 text-white shadow-xl"
        style={{
          left: position.x,
          top: position.y,
          cursor: dragging ? "grabbing" : "grab",
          pointerEvents: "auto",
          userSelect: "none",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-accent-main">
            Cut Axis
          </span>

          <span className="text-sm text-secondary-default">
            {Number(cutValue).toFixed(2)}
          </span>
        </div>

        <div
          className="mb-4 grid grid-cols-3 gap-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {["x", "y", "z"].map((axis) => (
            <button
              key={axis}
              type="button"
              onClick={() => setCutAxis(axis)}
              className={[
                "rounded-lg border px-3 py-2 text-sm font-bold",
                cutAxis === axis
                  ? "border-accent-main bg-accent-main text-white"
                  : "border-divider-main bg-transparent text-secondary-default",
              ].join(" ")}
            >
              {axis.toUpperCase()}
            </button>
          ))}
        </div>

        <input
          type="range"
          min={cutMin}
          max={cutMax}
          step={0.01}
          value={cutValue}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => setCutValue(Number(e.target.value))}
          className="w-full"
        />
      </div>
    </div>
  );
}