export default function UploadProgressRing({ progress, label }) {
  return (
    <div className="px-6 py-2">
      <div className="flex items-center gap-6">
        <div className="relative flex size-20 items-center justify-center">
          <svg className="-rotate-90 h-15 w-15" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="#4c3f72"
              strokeWidth="8"
              fill="none"
            />

            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="#0EA5E9"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={264}
              strokeDashoffset={264 - (264 * progress) / 100}
              className="transition-all duration-300"
            />
          </svg>

          <span className="absolute text-lg font-semibold text-accent-main">
            {progress}
          </span>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-normal">
            {label ||
              "Your project is being uploaded & prepared. Please be patient..."}
          </h3>
        </div>
      </div>
    </div>
  );
}
