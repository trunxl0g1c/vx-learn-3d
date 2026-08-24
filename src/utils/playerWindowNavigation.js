const PLAYER_WINDOW_NAME_PREFIX = "viqubed-player";

function sanitizeWindowNamePart(value) {
  return String(value || "project").replace(/[^a-zA-Z0-9_-]/g, "-");
}

function getWindowHref(targetWindow) {
  try {
    return targetWindow?.location?.href || "";
  } catch {
    return "";
  }
}

function renderPreparingScreen(targetWindow) {
  try {
    const documentRef = targetWindow.document;
    if (!documentRef?.body) return;

    documentRef.title = "Opening Viqubed Player";
    documentRef.body.replaceChildren();
    documentRef.body.style.margin = "0";
    documentRef.body.style.background = "#07111f";
    documentRef.body.style.color = "#ffffff";
    documentRef.body.style.fontFamily =
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    const shell = documentRef.createElement("div");
    shell.style.minHeight = "100vh";
    shell.style.display = "grid";
    shell.style.placeItems = "center";
    shell.style.padding = "24px";
    shell.textContent = "Preparing Viqubed Player...";

    documentRef.body.appendChild(shell);
  } catch {
    // The placeholder is optional. Navigation can continue without it.
  }
}


export function isCurrentDocumentFullscreen() {
  if (typeof document === "undefined") return false;

  return Boolean(
    document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement,
  );
}

export function releaseCurrentPlayerPreviewWindowName() {
  if (typeof window === "undefined") return;

  try {
    if (String(window.name || "").startsWith(`${PLAYER_WINDOW_NAME_PREFIX}-`)) {
      window.name = "";
    }
  } catch {
    // Window naming is only used to reuse non-fullscreen Player previews.
  }
}

export function prepareEditorOpenerForFullscreenHandoff(projectId) {
  if (typeof window === "undefined") return false;

  const opener = window.opener;
  if (!opener || opener.closed) return false;

  try {
    if (opener.location.origin !== window.location.origin) return false;

    const encodedProjectId = encodeURIComponent(String(projectId || ""));
    const expectedEditorPath = `/viqubed/editor/${encodedProjectId}`;

    if (opener.location.pathname !== expectedEditorPath) return false;

    // The fullscreen document cannot be transferred to another browser tab.
    // Move the old Editor tab out of the project before this fullscreen Player
    // tab becomes the active Editor, preventing two live editors from writing
    // to the same project at the same time.
    opener.location.replace("/viqubed");
    return true;
  } catch {
    return false;
  }
}

export function createEditorPlayerPath(projectId) {
  const encodedProjectId = encodeURIComponent(String(projectId || ""));
  const params = new URLSearchParams({
    preview: "true",
    source: "editor",
  });

  return `/viqubed/player/${encodedProjectId}?${params.toString()}`;
}

export function reservePlayerPreviewWindow(projectId) {
  if (typeof window === "undefined") return null;

  const targetName = `${PLAYER_WINDOW_NAME_PREFIX}-${sanitizeWindowNamePart(projectId)}`;
  const targetWindow = window.open("", targetName);

  if (!targetWindow) return null;

  const isBlankWindow = getWindowHref(targetWindow) === "about:blank";

  if (isBlankWindow) {
    renderPreparingScreen(targetWindow);
  } else {
    // This path is used only when the Editor itself is not fullscreen. A
    // previously opened named Player window may still be fullscreen, so make
    // sure reusing that window does not leak the old fullscreen state into a
    // new non-fullscreen preview. Exiting fullscreen does not require a new
    // user gesture.
    try {
      const targetDocument = targetWindow.document;
      const hasFullscreenElement = Boolean(
        targetDocument?.fullscreenElement ||
          targetDocument?.webkitFullscreenElement ||
          targetDocument?.mozFullScreenElement ||
          targetDocument?.msFullscreenElement,
      );

      if (hasFullscreenElement) {
        const exitResult = targetDocument.exitFullscreen
          ? targetDocument.exitFullscreen()
          : targetDocument.webkitExitFullscreen
            ? targetDocument.webkitExitFullscreen()
            : targetDocument.mozCancelFullScreen
              ? targetDocument.mozCancelFullScreen()
              : targetDocument.msExitFullscreen
                ? targetDocument.msExitFullscreen()
                : null;

        exitResult?.catch?.(() => {});
      }
    } catch {
      // Reusing the preview window remains best effort. Navigation itself will
      // still replace the old document.
    }
  }

  try {
    targetWindow.focus();
  } catch {
    // Focusing a window is best effort only.
  }

  return {
    targetWindow,
    closeOnFailure: isBlankWindow,
  };
}

export function navigateReservedPlayerWindow(reservation, playerPath) {
  const targetWindow = reservation?.targetWindow;
  if (!targetWindow || targetWindow.closed) return false;

  try {
    const absoluteUrl = new URL(playerPath, window.location.origin).toString();
    targetWindow.location.replace(absoluteUrl);
    targetWindow.focus();
    return true;
  } catch {
    return false;
  }
}

export function releaseReservedPlayerWindow(reservation) {
  if (!reservation?.closeOnFailure) return;

  try {
    if (!reservation.targetWindow?.closed) {
      reservation.targetWindow.close();
    }
  } catch {
    // Closing a failed placeholder window is best effort only.
  }
}

export function isPlayerOpenedFromEditor(search, navigationState) {
  const params = new URLSearchParams(search || "");

  return (
    params.get("source") === "editor" ||
    navigationState?.fromEditor === true ||
    navigationState?.preview === true
  );
}

export function focusEditorAndClosePlayer() {
  if (typeof window === "undefined") return false;

  const opener = window.opener;
  if (!opener || opener.closed) return false;

  try {
    if (opener.location.origin !== window.location.origin) return false;

    opener.focus();
    window.close();
    return true;
  } catch {
    return false;
  }
}
