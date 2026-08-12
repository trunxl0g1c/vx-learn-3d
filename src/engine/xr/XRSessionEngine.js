const SESSION_TYPES = Object.freeze({
  vr: "immersive-vr",
  ar: "immersive-ar",
});

function getXRNavigator() {
  if (typeof navigator === "undefined") return null;
  return navigator.xr || null;
}

function buildSessionInit(mode, settings = {}) {
  if (mode === "ar") {
    const init = {
      requiredFeatures: settings.placement === "surface" ? ["hit-test"] : [],
      optionalFeatures: ["local-floor", "dom-overlay", "anchors"],
    };

    if (typeof document !== "undefined" && document.body) {
      init.domOverlay = { root: document.body };
    }

    return init;
  }

  const optionalFeatures = ["bounded-floor"];
  if (settings.handTracking !== "off") optionalFeatures.push("hand-tracking");

  return {
    optionalFeatures: ["local-floor", ...optionalFeatures],
  };
}

export function createXRSessionEngine() {
  let renderer = null;
  let activeSession = null;
  let activeMode = null;
  const listeners = new Set();

  const emit = () => {
    const snapshot = { session: activeSession, mode: activeMode };
    listeners.forEach((listener) => listener(snapshot));
  };

  const handleSessionEnd = () => {
    activeSession = null;
    activeMode = null;
    emit();
  };

  return {
    setRenderer(nextRenderer) {
      renderer = nextRenderer || null;
      return renderer;
    },

    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getState() {
      return { session: activeSession, mode: activeMode, renderer };
    },

    async isSupported(mode) {
      const xr = getXRNavigator();
      const sessionType = SESSION_TYPES[mode];
      if (!xr || !sessionType || typeof xr.isSessionSupported !== "function") {
        return false;
      }

      try {
        return Boolean(await xr.isSessionSupported(sessionType));
      } catch {
        return false;
      }
    },

    async enter(mode, settings = {}) {
      const xr = getXRNavigator();
      const sessionType = SESSION_TYPES[mode];
      if (!xr) throw new Error("WebXR is not available in this browser/device.");
      if (!sessionType) throw new Error("Unknown XR mode.");
      if (!renderer?.xr) throw new Error("Player renderer is not ready for XR.");

      if (activeSession) {
        if (activeMode === mode) return activeSession;
        await activeSession.end();
      }

      const supported = await this.isSupported(mode);
      if (!supported) {
        throw new Error(
          mode === "vr"
            ? "Immersive VR is not supported on this browser/device."
            : "Immersive AR is not supported on this browser/device.",
        );
      }

      renderer.xr.enabled = true;
      renderer.xr.setReferenceSpaceType?.(mode === "vr" ? "local-floor" : "local");

      const session = await xr.requestSession(
        sessionType,
        buildSessionInit(mode, settings),
      );

      session.addEventListener("end", handleSessionEnd, { once: true });
      await renderer.xr.setSession(session);

      activeSession = session;
      activeMode = mode;
      emit();
      return session;
    },

    async exit() {
      if (!activeSession) return false;
      const session = activeSession;
      await session.end();
      return true;
    },

    dispose() {
      listeners.clear();
      if (activeSession) {
        activeSession.removeEventListener?.("end", handleSessionEnd);
      }
      activeSession = null;
      activeMode = null;
      renderer = null;
    },
  };
}

export default createXRSessionEngine;
