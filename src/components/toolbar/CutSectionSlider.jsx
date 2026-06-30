import { useState } from "react";
import Slider from "../ui/slider";

export default function CutSectionSlider({
  cutAxis,
  setCutAxis,
  cutValue,
  cutMin,
  cutMax,
  setCutValue,
}) {
  const [position, setPosition] = useState({
    x: window.innerWidth / 2 -450,
    y: window.innerHeight - 210,
  }); 
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
      <div
        onMouseDown={startDrag}
        className="absolute w-[380px] rounded-2xl border border-divider-main bg-primary/85 p-4 text-white shadow-[0_18px_50px_rgba(0,0,0,0.38)] backdrop-blur-xl backdrop-saturate-150"
        style={{
          left: position.x,
          top: position.y,
          cursor: dragging ? "grabbing" : "grab",
          pointerEvents: "auto",
          userSelect: "none",
        }}
      >
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

        <div onMouseDown={(e) => e.stopPropagation()}>
          <Slider
            label={`Cut ${String(cutAxis || "x").toUpperCase()}`}
            value={Number(cutValue.toFixed(2))}
            min={cutMin}
            max={cutMax}
            step={0.01}
            onChange={setCutValue}
          />
        </div>
      </div>
    </div>
  );
}