import { Html, useProgress } from "@react-three/drei";
import { useGlobalLoading } from "../../modules/loading/LoadingContext";

export default function LoadingModel() {
  const { progress, active } = useProgress();
  const { loading } = useGlobalLoading();

  const rawPercent = Math.round(progress || 0);
  const percent = active ? Math.min(rawPercent, 95) : 100;

  // The app-wide loading overlay (LoadingContext) already covers the whole
  // "opening a project" flow, including the 3D model load — when it's up,
  // rendering this Suspense fallback too just stacks a second identical
  // branded card on top of it. Only show this one when nothing else is
  // already telling the user something is loading (e.g. a Canvas-only
  // Suspense trigger with no surrounding showLoading() call).
  if (loading.show) return null;

  return (
    <Html center>
      <div className="max-w-[calc(100vw-32px)] w-[420px] rounded-[24px] border border-divider-main bg-dark-alpha px-8 py-9 text-center text-white shadow-[0_24px_90px_rgba(0,0,0,0.7)] backdrop-blur-xl">
        <div className="mx-auto mb-4 grid size-20 place-items-center rounded-full border border-divider-main bg-primary/70">
          <img
            src="/images/logo.svg"
            alt="Viqubed Studio"
            className="size-14 rounded-full"
          />
        </div>

        <div className="mb-1 text-xl font-normal text-white">
          Viqubed Studio
        </div>

        <div className="mb-7 text-sm text-secondary-default">
          Digital 3D Learning
        </div>

        <div className="mb-2 text-lg font-normal">Loading 3D Object...</div>

        <div className="mx-auto mb-7 max-w-[320px] text-sm leading-6 text-contrast-grayout">
          Please wait while the 3D model is being prepared.
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-accent-main transition-all duration-300"
            style={{
              width: `${percent}%`,
            }}
          />
        </div>

        <div className="mt-3 text-sm font-normal text-secondary-default">
          {percent}%
        </div>
      </div>
    </Html>
  );
}
