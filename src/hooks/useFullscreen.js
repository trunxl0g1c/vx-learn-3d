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

// Some browsers put the window into native/OS-level fullscreen on F11
// without reliably setting document.fullscreenElement or firing
// fullscreenchange for it — the Fullscreen API only reports state changes
// it originated, and outerWidth/outerHeight have their own history of
// cross-browser quirks for this exact case. So check two independent
// signals instead of trusting either alone:
//   - outer window vs. screen: a merely maximized window's outerHeight
//     matches screen.availHeight (screen minus taskbar); true fullscreen
//     fills the whole screen.height (taskbar hidden too).
//   - inner viewport vs. screen: with no toolbar/tabs/bookmarks bar to eat
//     into it, a fullscreen viewport's innerHeight also approaches
//     screen.height — a merely maximized window's innerHeight is smaller
//     than its own outerHeight by however tall that chrome is (usually
//     70-140px), so this alone rules out "maximized but not fullscreen".
// Tolerance is a handful of px, not 1 — fractional Windows display scaling
// (125%/150%, very common) rounds these independently, so two values that
// are visually "exactly fullscreen" can still differ by a few CSS px.
const FULLSCREEN_SIZE_TOLERANCE_PX = 6;

function closeTo(a, b, tolerance = FULLSCREEN_SIZE_TOLERANCE_PX) {
  return typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= tolerance;
}

function isWindowFillingScreen(win) {
  const screen = win?.screen;
  if (!screen?.width || !screen?.height) return false;

  const outerMatch =
    win.outerWidth &&
    win.outerHeight &&
    closeTo(win.outerWidth, screen.width) &&
    closeTo(win.outerHeight, screen.height);

  const innerMatch =
    win.innerWidth &&
    win.innerHeight &&
    closeTo(win.innerWidth, screen.width) &&
    closeTo(win.innerHeight, screen.height);

  return Boolean(outerMatch || innerMatch);
}

export default function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const syncFullscreenState = () => {
      const apiFullscreen = Boolean(getFullscreenElement(document));
      // Fall back to the window/screen-size heuristic only when the
      // Fullscreen API itself reports nothing — this is what catches an
      // F11 press the API never learns about (see isWindowFillingScreen).
      setIsFullscreen(
        apiFullscreen ||
          (typeof window !== "undefined" && isWindowFillingScreen(window)),
      );
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
    // Events are a fast path when they fire, but whether F11 actually
    // dispatches fullscreenchange/resize to the page is inconsistent across
    // browsers and OS window-manager setups — not something to keep
    // guessing at. Polling isWindowFillingScreen()/getFullscreenElement()
    // directly re-derives the real state on a short timer regardless of
    // which (if any) event fired, so the button can't get stuck stale.
    const pollId = setInterval(syncFullscreenState, 400);
    window.addEventListener("resize", syncFullscreenState);

    return () => {
      events.forEach((eventName) => {
        document.removeEventListener(eventName, syncFullscreenState);
      });
      window.removeEventListener("resize", syncFullscreenState);
      clearInterval(pollId);
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
