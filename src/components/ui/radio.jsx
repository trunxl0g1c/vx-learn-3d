function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function RadioButton({
  checked = false,
  onCheckedChange,
  disabled = false,
  label,
  title,
  className = "",
  labelClassName = "",
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      onClick={() => {
        if (!checked) onCheckedChange?.(true);
      }}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 text-sm font-normal text-white",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border transition",
          checked
            ? "border-accent-main bg-accent-main"
            : "border-secondary-default bg-transparent",
        )}
      >
        <span
          className={cn(
            "size-2 rounded-full bg-white transition",
            checked ? "scale-100 opacity-100" : "scale-0 opacity-0",
          )}
        />
      </span>

      {label && (
        <span className={cn("text-secondary-default", labelClassName)}>
          {label}
        </span>
      )}
    </button>
  );
}

RadioButton.displayName = "RadioButton";

export { RadioButton };
export default RadioButton;
