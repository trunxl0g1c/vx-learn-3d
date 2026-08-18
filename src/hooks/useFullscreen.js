import { useCallback, useEffect, useState } from "react";

function getFullscreenElement(doc) {
  return (
    doc?.fullscreenElement ||
    doc?.webkitFullscreenElement ||
    doc?.mozFullScreenElement ||
    doc?.msFullscreenElement ||
    null
  );
}

function canUseFullscreen(doc) {
  if (!doc) return false;

  const root = doc.documentElement;
  return Boolean(
    doc.fullscreenEnabled ||
      doc.webkitFullscreenEnabled ||
      root?.requestFullscreen ||
      root?.webkitRequestFullscreen ||
      root?.mozRequestFullScreen ||
      root?.msRequestFullscreen,
  );
}

export default function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(getFullscreenElement(document)));
      setIsSupported(canUseFullscreen(document));
    };

    syncFullscreenState();

    const events = [
      "fullscreenchange",
      "webkitfullscreenchange",
      "mozfullscreenchange",
      "MSFullscreenChange",
    ];

    events.forEach((eventName) => {
      document.addEventListener(eventName, syncFullscreenState);
    });

    return () => {
      events.forEach((eventName) => {
        document.removeEventListener(eventName, syncFullscreenState);
      });
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return false;

    const doc = document;
    const root = doc.documentElement;

    try {
      if (getFullscreenElement(doc)) {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
        return true;
      }

      if (root.requestFullscreen) {
        try {
          await root.requestFullscreen({ navigationUI: "hide" });
        } catch {
          await root.requestFullscreen();
        }
      } else if (root.webkitRequestFullscreen) {
        root.webkitRequestFullscreen();
      } else if (root.mozRequestFullScreen) {
        root.mozRequestFullScreen();
      } else if (root.msRequestFullscreen) {
        root.msRequestFullscreen();
      } else {
        return false;
      }

      return true;
    } catch (error) {
      console.warn("Fullscreen request failed:", error);
      return false;
    }
  }, []);

  return {
    isFullscreen,
    isSupported,
    toggleFullscreen,
  };
}
