export default function ColorFieldInput({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-normal text-contrast-grayout">
        {label}
      </label>

      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-12 cursor-pointer rounded-lg border border-secondary-dark bg-transparent p-1"
        />

        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-lg border border-secondary-dark bg-primary px-3 text-sm font-normal text-white outline-none focus:border-secondary-default"
        />
      </div>
    </div>
  );
}
