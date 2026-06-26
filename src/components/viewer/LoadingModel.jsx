import { Html, useProgress } from "@react-three/drei";

export default function LoadingModel() {
  const { progress, active } = useProgress();

  const rawPercent = Math.round(progress || 0);

  const percent = active
    ? Math.min(rawPercent, 95)
    : 100;

  return (
    <Html center>
      <div className="min-w-[320px] rounded-2xl border border-divider-main bg-primary/95 p-6 text-center text-white shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="mb-4 text-xl font-bold text-white">
          Loading 3D Object...
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-accent-main transition-all duration-300"
            style={{
              width: `${percent}%`,
            }}
          />
        </div>

        <div className="mt-3 text-sm font-bold text-secondary-default">
          {percent}%
        </div>
      </div>
    </Html>
  );
}