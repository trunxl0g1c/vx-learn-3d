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

  return (
    <div className="vx-global-loading">
      <div className="vx-global-loading-card">
        <div className="vx-global-loading-logo">VXE</div>

        <div className="vx-global-loading-title">
          {loading.title || "Loading"}
        </div>

        <div className="vx-global-loading-text">
          {loading.text || "Please wait..."}
        </div>

        <div className="vx-global-loading-bar">
          <div
            style={{
              width:
                loading.progress === null
                  ? "45%"
                  : `${Math.min(100, Math.max(0, loading.progress))}%`,
            }}
            className={loading.progress === null ? "indeterminate" : ""}
          />
        </div>

        {loading.progress !== null && (
          <div className="vx-global-loading-percent">
            {Math.round(loading.progress)}%
          </div>
        )}
      </div>
    </div>
  );
}