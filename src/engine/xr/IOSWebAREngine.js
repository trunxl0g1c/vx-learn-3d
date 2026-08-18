function getMediaDevices() {
  if (typeof navigator === "undefined") return null;
  return navigator.mediaDevices || null;
}

function stopStream(stream) {
  if (!stream) return;
  try {
    stream.getTracks?.().forEach((track) => track.stop?.());
  } catch {
    // Stream cleanup is best-effort. A browser may already have ended tracks.
  }
}

export function supportsIOSWebARCamera() {
  const mediaDevices = getMediaDevices();
  return Boolean(mediaDevices && typeof mediaDevices.getUserMedia === "function");
}

export function createIOSWebAREngine() {
  let stream = null;
  let active = false;
  const listeners = new Set();

  const emit = () => {
    const snapshot = { active, stream };
    listeners.forEach((listener) => listener(snapshot));
  };

  const stop = () => {
    stopStream(stream);
    stream = null;
    active = false;
    emit();
    return true;
  };

  return {
    isAvailable() {
      return supportsIOSWebARCamera();
    },

    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getState() {
      return { active, stream };
    },

    async start() {
      const mediaDevices = getMediaDevices();
      if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function") {
        throw new Error("Camera access is not available in this browser.");
      }

      if (typeof window !== "undefined" && !window.isSecureContext) {
        throw new Error("iPhone WebAR camera requires HTTPS.");
      }

      if (active && stream) return stream;

      stopStream(stream);
      stream = null;
      active = false;

      try {
        stream = await mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
      } catch (cameraError) {
        const name = cameraError?.name || "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          throw new Error(
            "Camera permission was denied. Allow camera access to use iPhone WebAR.",
          );
        }
        if (name === "NotFoundError" || name === "OverconstrainedError") {
          throw new Error("A usable iPhone camera could not be found.");
        }
        throw new Error(cameraError?.message || "Unable to start the iPhone camera.");
      }

      const videoTrack = stream.getVideoTracks?.()[0] || null;
      if (!videoTrack) {
        stopStream(stream);
        stream = null;
        throw new Error("The camera started without a video track.");
      }

      videoTrack.addEventListener?.("ended", () => {
        if (stream && active) stop();
      }, { once: true });

      active = true;
      emit();
      return stream;
    },

    stop,

    dispose() {
      stopStream(stream);
      stream = null;
      active = false;
      listeners.clear();
    },
  };
}

export default createIOSWebAREngine;
