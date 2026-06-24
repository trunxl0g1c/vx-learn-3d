function Switch({
  checked = false,
  onCheckedChange,
  disabled = false,
  className = "",
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={[
        "cursor-pointer relative h-[22px] w-[46px] rounded-full border transition",
        "disabled:pointer-events-none disabled:opacity-50",
        checked
          ? "border-[#67D4EA] bg-[#0B7FB2]"
          : "border-[#5E6875] bg-[#222C30]",
        className,
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-1/2 size-4 -translate-y-1/2 rounded-full transition-all duration-200",
          checked ? "left-[25px] bg-white" : "left-[4px] bg-[#8A8F99]",
        ].join(" ")}
      />
    </button>
  );
}

Switch.displayName = "Switch";

export { Switch };
export default Switch;
