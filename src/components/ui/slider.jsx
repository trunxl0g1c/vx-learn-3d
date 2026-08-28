import { RotateCcw } from "lucide-react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Slider({
  label,
  value = 0,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  onReset,
  className = "",
}) {
  const percent = ((Number(value) - min) / (max - min)) * 100;

  return (
    <div className={cn(className)}>
      <div className="flex items-center justify-between text-sm font-normal">
        <span className="text-secondary-default">{label}</span>

        <span className="flex items-center gap-1.5">
          <span className="text-[#86899B] text-xs">{value}</span>

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              title={`Reset ${label || "value"} to default`}
              aria-label={`Reset ${label || "value"} to default`}
              className="grid size-5 cursor-pointer place-items-center rounded text-[#86899B] transition hover:text-secondary-default"
            >
              <RotateCcw className="size-3" />
            </button>
          )}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-transparent outline-none"
        style={{
          background: `linear-gradient(to right, var(--color-accent-main) 0%, var(--color-accent-main) ${percent}%, #5E6875 ${percent}%, #5E6875 100%)`,
        }}
      />
    </div>
  );
}

export { Slider };
export default Slider;
