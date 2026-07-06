import { createContext, useCallback, useContext, useState } from "react";

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  const [loading, setLoading] = useState({
    show: false,
    title: "",
    text: "",
    progress: null,
  });

  const showLoading = useCallback(({ title, text, progress = null }) => {
    setLoading({
      show: true,
      title,
      text,
      progress,
    });
  }, []);

  const updateLoading = useCallback(({ title, text, progress }) => {
    setLoading((prev) => ({
      ...prev,
      show: true,
      title: title ?? prev.title,
      text: text ?? prev.text,
      progress: progress ?? prev.progress,
    }));
  }, []);

  const hideLoading = useCallback(() => {
    setLoading((prev) => ({
      ...prev,
      show: false,
    }));
  }, []);

  return (
    <LoadingContext.Provider
      value={{
        loading,
        showLoading,
        updateLoading,
        hideLoading,
      }}
    >
      {children}
      <GlobalLoadingOverlay loading={loading} />
    </LoadingContext.Provider>
  );
}

export function useGlobalLoading() {
  const context = useContext(LoadingContext);

  if (!context) {
    throw new Error("useGlobalLoading harus dipakai di dalam LoadingProvider");
  }

  return context;
}

function GlobalLoadingOverlay({ loading }) {
  if (!loading.show) return null;

  const progress =
    loading.progress === null
      ? null
      : Math.min(100, Math.max(0, loading.progress));

  return (
    <div className="fixed inset-0 z-999 grid place-items-center bg-black/70 backdrop-blur-md">
      <div className="w-[420px] rounded-[24px] border border-divider-main bg-dark-alpha px-8 py-9 text-center text-white shadow-[0_24px_90px_rgba(0,0,0,0.7)]">
        <div className="mx-auto mb-4 grid size-20 place-items-center rounded-full border border-divider-main bg-primary/70">
          <img
            src="/images/logo.svg"
            alt="VXplore Studio"
            className="size-14 rounded-full"
          />
        </div>

        <div className="mb-1 text-xl font-normal text-white">
          VXplore Studio
        </div>

        <div className="mb-7 text-sm text-secondary-default">
          Digital 3D Learning
        </div>

        <div className="mb-2 text-lg font-normal">
          {loading.title || "Loading"}
        </div>

        <div className="mx-auto mb-7 max-w-[320px] text-sm leading-6 text-contrast-grayout">
          {loading.text || "Please wait..."}
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-black/40">
          <div
            className={[
              "h-full rounded-full bg-accent-main transition-all duration-300",
              progress === null
                ? "animate-[vx-loading-slide_1.1s_infinite_ease-in-out]"
                : "",
            ].join(" ")}
            style={{
              width: progress === null ? "45%" : `${progress}%`,
            }}
          />
        </div>

        {progress !== null && (
          <div className="mt-3 text-sm font-normal text-secondary-default">
            {Math.round(progress)}%
          </div>
        )}

        <style>
          {`
            @keyframes vx-loading-slide {
              0% {
                transform: translateX(-130%);
              }
              100% {
                transform: translateX(260%);
              }
            }
          `}
        </style>
      </div>
    </div>
  );
}
