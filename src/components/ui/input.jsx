function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Input({
  className = "",
  inputClassName = "",
  leftIcon,
  rightIcon,
  ...props
}) {
  return (
    <div
      className={cn(
        "flex h-[46px] w-full items-center gap-3 rounded-full border border-secondary-default bg-primary px-4",
        "transition focus-within:border-secondary-default focus-within:ring-1 focus-within:ring-secondary-default",
        className,
      )}
    >
      {leftIcon && (
        <span className="flex shrink-0 items-center text-secondary-default">
          {leftIcon}
        </span>
      )}

      <input
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-base font-semibold text-white outline-none",
          "placeholder:text-contrast-grayout",
          inputClassName,
        )}
        {...props}
      />

      {rightIcon && (
        <span className="flex shrink-0 items-center text-secondary-default">
          {rightIcon}
        </span>
      )}
    </div>
  );
}

Input.displayName = "Input";

export { Input };
export default Input;
