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
