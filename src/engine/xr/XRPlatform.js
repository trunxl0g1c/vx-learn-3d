function getUserAgent() {
  if (typeof navigator === "undefined") return "";
  return String(navigator.userAgent || "").toLowerCase();
}

function getNavigatorPlatform() {
  if (typeof navigator === "undefined") return "";
  return String(navigator.platform || "");
}

function isIPadDesktopMode() {
  if (typeof navigator === "undefined") return false;
  return (
    getNavigatorPlatform() === "MacIntel" &&
    Number(navigator.maxTouchPoints || 0) > 1
  );
}

export function detectXRPlatform() {
  const userAgent = getUserAgent();
  const quest = /oculusbrowser|meta quest|quest\//.test(userAgent);
  const ios = /iphone|ipad|ipod/.test(userAgent) || isIPadDesktopMode();
  const android = !quest && /android/.test(userAgent);

  let kind = "desktop";
  let label = "Desktop";

  if (quest) {
    kind = "quest";
    label = "Meta Quest";
  } else if (android) {
    kind = "android";
    label = "Android";
  } else if (ios) {
    kind = "ios";
    label = /ipad/.test(userAgent) || isIPadDesktopMode() ? "iPad" : "iPhone";
  }

  return Object.freeze({
    kind,
    label,
    isQuest: quest,
    isAndroid: android,
    isIOS: ios,
    isMobile: quest || android || ios,
    hasWebXR:
      typeof navigator !== "undefined" && Boolean(navigator.xr),
    isSecureContext:
      typeof window === "undefined" ? true : Boolean(window.isSecureContext),
  });
}

export function supportsAppleARQuickLook() {
  const platform = detectXRPlatform();
  if (!platform.isIOS || typeof document === "undefined") return false;

  try {
    const anchor = document.createElement("a");
    if (!anchor.relList || typeof anchor.relList.supports !== "function") {
      return true;
    }
    return Boolean(anchor.relList.supports("ar"));
  } catch {
    return true;
  }
}

export default detectXRPlatform;
