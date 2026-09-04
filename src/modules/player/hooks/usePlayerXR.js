import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createIOSARKitBridgeEngine,
  createXRQuickLookEngine,
  createXRSessionEngine,
  detectXRPlatform,
  normalizeXRSettings,
} from "../../../engine/xr";
import { prepareARKitMaterial } from "../prepareARKitMaterial";

export default function usePlayerXR(viewerSettings, modelScene, modelFileName, material) {
  const engineRef = useRef(null);
  const quickLookRef = useRef(null);
  const arKitBridgeRef = useRef(null);
  if (!engineRef.current) engineRef.current = createXRSessionEngine();
  if (!quickLookRef.current) quickLookRef.current = createXRQuickLookEngine();
  if (!arKitBridgeRef.current) arKitBridgeRef.current = createIOSARKitBridgeEngine();

  const platform = useMemo(() => detectXRPlatform(), []);
  const [support, setSupport] = useState({ vr: null, ar: null });
  const [webXRMode, setWebXRMode] = useState(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [rendererReady, setRendererReady] = useState(false);
  const [quickLook, setQuickLook] = useState({
    available: quickLookRef.current.isAvailable(),
    preparing: false,
    ready: false,
  });
  const [arKit, setARKit] = useState({
    available: arKitBridgeRef.current.isAvailable(),
    preparing: false,
    ready: false,
    fileName: "",
    handoffMethod: "",
  });

  const settings = useMemo(
    () => normalizeXRSettings(viewerSettings?.xr),
    [viewerSettings?.xr],
  );

  const activeMode = webXRMode;

  useEffect(() => {
    const engine = engineRef.current;
    return engine.subscribe(({ mode }) => {
      setWebXRMode(mode || null);
      if (!mode) setError("");
    });
  }, []);


  useEffect(() => {
    arKitBridgeRef.current?.dispose?.();
    setARKit((current) => ({
      ...current,
      preparing: false,
      ready: false,
      fileName: "",
      handoffMethod: "",
    }));
  }, [material, modelScene, viewerSettings]);

  useEffect(
    () => () => {
      engineRef.current?.dispose?.();
      quickLookRef.current?.dispose?.();
      arKitBridgeRef.current?.dispose?.();
    },
    [],
  );

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

  const prepareQuickLook = useCallback(async () => {
    if (!platform.isIOS || !quickLook.available || !modelScene) return false;
    setQuickLook((current) => ({ ...current, preparing: true }));
    try {
      await quickLookRef.current.prepare(modelScene, {
        fileName: modelFileName || "viqubed-model.glb",
      });
      setQuickLook((current) => ({
        ...current,
        preparing: false,
        ready: true,
      }));
      return true;
    } catch (prepareError) {
      setQuickLook((current) => ({
        ...current,
        preparing: false,
        ready: false,
      }));
      setError(
        prepareError?.message || "Unable to prepare this model for iPhone AR.",
      );
      return false;
    }
  }, [modelFileName, modelScene, platform.isIOS, quickLook.available]);

  // Quick Look is prepared only after the user presses the iPhone/iPad AR button.
  // Large GLB scenes are converted to USDZ on demand so normal Player loading stays light.

  const prepareARKit = useCallback(async () => {
    if (!platform.isIOS || !arKit.available || !modelScene || !material) {
      return false;
    }

    setError("");
    setARKit((current) => ({ ...current, preparing: true }));
    try {
      const hydratedMaterial = await prepareARKitMaterial(material);
      const result = await arKitBridgeRef.current.prepare({
        scene: modelScene,
        modelFileName: modelFileName || "viqubed-model.glb",
        project: {
          id: material.projectId || null,
          name: material.projectName || material.title || "Viqubed Project",
        },
        material: hydratedMaterial,
        viewer: viewerSettings || {},
        runtime: {
          source: "viqubed-player",
          interactionContract: "viqubed-runtime-v1",
          features: [
            "material",
            "chapter",
            "procedure",
            "slide",
            "animation",
            "marker",
            "selection",
            "visibility",
            "blink",
            "xray",
            "cut",
          ],
        },
      });
      setARKit((current) => ({
        ...current,
        preparing: false,
        ready: true,
        fileName: result.file?.name || "",
      }));
      setError(
        "Native ARKit package is ready. Tap Open Native AR again to send it to the Viqubed AR iOS app.",
      );
      return true;
    } catch (prepareError) {
      setARKit((current) => ({ ...current, preparing: false, ready: false }));
      setError(
        prepareError?.message || "Unable to prepare the native iOS AR package.",
      );
      return false;
    }
  }, [
    arKit.available,
    material,
    modelFileName,
    modelScene,
    platform.isIOS,
    viewerSettings,
  ]);

  const enterARKit = useCallback(async () => {
    if (!platform.isIOS || !arKit.available) return false;
    if (!arKitBridgeRef.current.getState().ready) {
      return prepareARKit();
    }

    setError("");
    try {
      const result = await arKitBridgeRef.current.handoff({
        title: material?.projectName || material?.title || "Viqubed AR",
        text: "Open this project with the Viqubed native ARKit runtime.",
      });
      setARKit((current) => ({
        ...current,
        handoffMethod: result.method || "",
      }));
      if (result.method === "download") {
        setError(
          "The .viqar package was downloaded because direct file sharing is unavailable in this browser.",
        );
      }
      return true;
    } catch (handoffError) {
      if (handoffError?.name === "AbortError") return false;
      setError(handoffError?.message || "Unable to open the native iOS AR handoff.");
      return false;
    }
  }, [arKit.available, material?.projectName, material?.title, platform.isIOS, prepareARKit]);

  const enter = useCallback(
    async (mode) => {
      setError("");
      const modeSettings = mode === "ar" ? settings.ar : settings.vr;
      if (!modeSettings.enabled) {
        setError(`${mode.toUpperCase()} is disabled for this project.`);
        return false;
      }

      try {
        const sessionSettings =
          mode === "ar" && platform.isAndroid
            ? { ...modeSettings, requireDomOverlay: true }
            : modeSettings;
        await engineRef.current.enter(mode, sessionSettings);
        return true;
      } catch (sessionError) {
        setError(sessionError?.message || "Unable to start XR session.");
        return false;
      }
    },
    [platform.isAndroid, settings.ar, settings.vr],
  );

  const openQuickLookFallback = useCallback(async () => {
    if (!platform.isIOS || !quickLook.available) return false;

    if (!quickLookRef.current.getState().ready) {
      const prepared = await prepareQuickLook();
      if (!prepared) return false;
      setError(
        "Apple AR is ready. Tap View in Apple AR once more to open Quick Look.",
      );
      return false;
    }

    if (quickLookRef.current.open()) return true;
    setError("Unable to open Apple AR Quick Look.");
    return false;
  }, [platform.isIOS, prepareQuickLook, quickLook.available]);

  const enterAR = useCallback(async () => {
    setError("");
    if (!settings.ar.enabled) {
      setError("AR is disabled for this project.");
      return false;
    }

    const webXRSupported =
      support.ar === true ||
      (support.ar === null &&
        platform.hasWebXR &&
        (await engineRef.current.isSupported("ar")));

    // Capability wins over platform. Quest, Android, Vision-class devices, or
    // any future browser that exposes immersive-ar stays on the WebXR engine.
    if (webXRSupported) return enter("ar");

    // Safari/iOS does not expose the immersive-ar WebXR path used by Quest
    // and Android. Use Apple AR Quick Look as the explicit iPhone/iPad AR
    // backend. Quick Look is native anchored AR, but does not render the web
    // Player UI inside the AR viewer.
    if (platform.isIOS) {
      return openQuickLookFallback();
    }

    if ((platform.isAndroid || platform.isQuest) && !platform.isSecureContext) {
      setError("WebXR AR requires a secure HTTPS context on this device.");
      return false;
    }

    if (platform.isAndroid) {
      setError(
        "Immersive AR is not available on this Android device/browser. Use an ARCore-compatible device with WebXR enabled.",
      );
      return false;
    }

    setError("Immersive AR is not supported on this browser/device.");
    return false;
  }, [
    enter,
    openQuickLookFallback,
    platform.hasWebXR,
    platform.isAndroid,
    platform.isIOS,
    platform.isQuest,
    platform.isSecureContext,
    quickLook.available,
    settings.ar.enabled,
    support.ar,
  ]);

  const exit = useCallback(async () => {
    setError("");
    try {
      return await engineRef.current.exit();
    } catch (sessionError) {
      setError(sessionError?.message || "Unable to close XR session.");
      return false;
    }
  }, []);

  const arStrategy =
    support.ar === true
      ? "webxr"
      : platform.isIOS && quickLook.available
        ? "quick-look"
        : support.ar === false
          ? "unsupported"
          : "checking";

  const canEnterAR =
    settings.ar.enabled &&
    (arStrategy === "webxr"
      ? rendererReady
      : arStrategy === "quick-look"
        ? Boolean(modelScene) && !quickLook.preparing
        : false);


  return {
    settings,
    support,
    platform,
    arStrategy,
    canEnterAR,
    quickLook,
    arKit,
    activeMode,
    error,
    checking,
    rendererReady,
    setRenderer,
    refreshSupport,
    enterVR: () => enter("vr"),
    enterAR,
    enterQuickLook: openQuickLookFallback,
    enterARKit,
    exit,
  };
}
