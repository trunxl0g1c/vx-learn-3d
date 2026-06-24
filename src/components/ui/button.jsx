export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const variants = {
  default: "bg-accent-main text-white border-transparent hover:bg-accent-main/80",
  outline: "bg-transparent text-white border-white/30 hover:bg-white/10",
  cyanOutline:
    "bg-primary text-secondary-default border-secondary-default hover:bg-secondary-default/10 shadow-[0_0_0_1px_rgba(114,207,228,0.15)]",
  cyanSolid: "bg-[#0b7fb2] text-white border-[#3ab9e8] hover:bg-[#0a91ca]",
  gold: "bg-[#b9a15a] text-white border-transparent hover:bg-[#c5ad64]",
  darkOutline: "bg-[#111b1d] text-white border-[#6f7f86] hover:bg-white/10",
};

const sizes = {
  sm: "h-9 px-4 text-sm rounded-lg gap-2",
  md: "h-11 px-6 text-base rounded-xl gap-2.5",
  lg: "h-13 px-8 text-lg rounded-xl gap-3",
  xl: "h-[58px] px-9 text-[20px] rounded-xl gap-4",
};

export default function Button({
  className = "",
  variant = "default",
  size = "md",
  children,
  disabled,
  ...props
}) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center border font-semibold tracking-wide",
        "select-none outline-none transition-all duration-200",
        "active:translate-y-px",
        "disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:ring-2 focus-visible:ring-cyan-400/50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
