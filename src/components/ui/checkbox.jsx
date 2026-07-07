import { Check } from "lucide-react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Checkbox({
  checked = false,
  onCheckedChange,
  disabled = false,
  label,
  className = "",
  labelClassName = "",
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 text-sm font-normal text-white",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-5 place-items-center rounded border transition",
          checked
            ? "border-accent-main bg-accent-main text-white"
            : "border-secondary-default bg-transparent text-transparent",
        )}
      >
        <Check className="size-3.5" />
      </span>

      {label && (
        <span className={cn("text-secondary-default", labelClassName)}>
          {label}
        </span>
      )}
    </button>
  );
}

Checkbox.displayName = "Checkbox";

export { Checkbox };
export default Checkbox;
