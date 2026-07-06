export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

const variants = {
  default:
    "bg-accent-main text-white border-transparent hover:bg-accent-main/80",
  outline: "bg-transparent text-white border-white/30 hover:bg-white/10",
  cyanOutline:
    "bg-dark-alpha text-secondary-default border-grayout-dark hover:bg-grayout-dark/10",
  cyanSolid: "bg-[#0b7fb2] text-white border-[#3ab9e8] hover:bg-[#0a91ca]",
  gold: "bg-[#b9a15a] text-white border-transparent hover:bg-[#c5ad64]",
  darkOutline: "bg-[#111b1d] text-white border-[#6f7f86] hover:bg-white/10",
  destructive: "border-red-500/40 px-4 text-sm text-red-300 hover:bg-red-500/10",

  // layouts
  sidebar:
    "justify-start border-transparent bg-transparent text-contrast-grayout hover:bg-accent-dark hover:text-white",
};

const sizes = {
  xs: "h-8 px-3 text-xs rounded-lg gap-1.5",
  sm: "h-9 px-4 text-sm rounded-lg gap-2",
  md: "h-11 px-6 text-base rounded-lg gap-2.5",
  lg: "h-13 px-8 text-lg rounded-lg gap-3",
  xl: "h-[58px] px-9 text-[20px] rounded-lg gap-4",
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
        "inline-flex cursor-pointer items-center justify-center border font-normal tracking-wide",
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
