import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createXRSessionEngine, normalizeXRSettings } from "../../../engine/xr";

export default function usePlayerXR(viewerSettings) {
  const engineRef = useRef(null);
  if (!engineRef.current) engineRef.current = createXRSessionEngine();

  const [support, setSupport] = useState({ vr: null, ar: null });
  const [activeMode, setActiveMode] = useState(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [rendererReady, setRendererReady] = useState(false);

  const settings = useMemo(
    () => normalizeXRSettings(viewerSettings?.xr),
    [viewerSettings?.xr],
  );

  useEffect(() => {
    const engine = engineRef.current;
    return engine.subscribe(({ mode }) => {
      setActiveMode(mode || null);
      if (!mode) setError("");
    });
  }, []);

  useEffect(() => () => engineRef.current?.dispose?.(), []);

  const setRenderer = useCallback((renderer) => {
    engineRef.current?.setRenderer(renderer);
    setRendererReady(Boolean(renderer));
  }, []);

  const refreshSupport = useCallback(async () => {
    setChecking(true);
    try {
      const [vr, ar] = await Promise.all([
        engineRef.current.isSupported("vr"),
        engineRef.current.isSupported("ar"),
      ]);
      const next = { vr, ar };
      setSupport(next);
      return next;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!settings.vr.enabled && !settings.ar.enabled) return;
    void refreshSupport();
  }, [refreshSupport, settings.ar.enabled, settings.vr.enabled]);

  const enter = useCallback(
    async (mode) => {
      setError("");
      const modeSettings = mode === "ar" ? settings.ar : settings.vr;
      if (!modeSettings.enabled) {
        setError(`${mode.toUpperCase()} is disabled for this project.`);
        return false;
      }

      try {
        await engineRef.current.enter(mode, modeSettings);
        return true;
      } catch (sessionError) {
        setError(sessionError?.message || "Unable to start XR session.");
        return false;
      }
    },
    [settings.ar, settings.vr],
  );

  const exit = useCallback(async () => {
    setError("");
    try {
      return await engineRef.current.exit();
    } catch (sessionError) {
      setError(sessionError?.message || "Unable to close XR session.");
      return false;
    }
  }, []);

  return {
    settings,
    support,
    activeMode,
    error,
    checking,
    rendererReady,
    setRenderer,
    refreshSupport,
    enterVR: () => enter("vr"),
    enterAR: () => enter("ar"),
    exit,
  };
}
