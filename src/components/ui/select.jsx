import { ChevronDown } from "lucide-react";
import MaterialIcon from "./material-icon";

export default function SelectField({
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
  className = "",
  iconClassName = "",
}) {
  return (
    <div className={`relative w-full ${className}`}>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={`h-[46px] w-full cursor-pointer appearance-none rounded-lg border border-secondary-default bg-transparent px-3 pr-10 text-sm font-normal text-white outline-none focus:ring-1 focus:ring-accent-main disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        {placeholder && (
          <option value="" disabled className="bg-[#1f1d20] text-white">
            {placeholder}
          </option>
        )}

        {options.map((option) => (
          <option
            key={option.value ?? option.label}
            value={option.value}
            className="bg-[#1f1d20] text-white"
          >
            {option.label}
          </option>
        ))}
      </select>

      <MaterialIcon
        name="arrow_back_2"
        fill={1}
        size={18}
        className={`-rotate-90 text-secondary-default -translate-y-1/2 pointer-events-none absolute right-4 top-1/2 ${iconClassName}`}
      />
    </div>
  );
}
