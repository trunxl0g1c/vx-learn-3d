let viewerPagePromise = null;
let playerPagePromise = null;

export function loadViewerPage() {
  if (!viewerPagePromise) {
    viewerPagePromise = import("./ViewerPage").catch((error) => {
      viewerPagePromise = null;
      throw error;
    });
  }

  return viewerPagePromise;
}

export function loadPlayerPage() {
  if (!playerPagePromise) {
    playerPagePromise = import("./modules/player/PlayerPage").catch((error) => {
      playerPagePromise = null;
      throw error;
    });
  }

  return playerPagePromise;
}


export function preloadProjectRoute(role) {
  return role === "PLAYER" ? loadPlayerPage() : loadViewerPage();
}
