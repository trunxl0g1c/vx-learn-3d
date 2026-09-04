function normalizeNumericArray(value, length) {
  if (!Array.isArray(value) || value.length < length) return null;

  const normalized = value.slice(0, length).map(Number);
  return normalized.every(Number.isFinite) ? normalized : null;
}

function normalizePositiveNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizeProjectionMode(value) {
  return value === "orthographic" ? "orthographic" : "perspective";
}

function createLegacyCameraView(chapter) {
  if (!chapter || chapter.cameraViewSaved === false) return null;

  const position = normalizeNumericArray(chapter.cameraPosition, 3);
  const target = normalizeNumericArray(chapter.cameraTarget, 3);

  if (!position || !target) return null;

  return {
    position,
    target,
    quaternion: normalizeNumericArray(chapter.cameraQuaternion, 4),
    up: normalizeNumericArray(chapter.cameraUp, 3),
    zoom: normalizePositiveNumber(chapter.cameraZoom, 1),
    fov: normalizePositiveNumber(chapter.cameraFov, 50),
    cameraType: normalizeProjectionMode(
      chapter.cameraType || chapter.cameraProjectionMode,
    ),
    modelRotation: normalizeNumericArray(chapter.modelRotation, 3),
    savedAt: chapter.cameraViewSavedAt || null,
  };
}

export function normalizeChapterCameraView(view, index = 0) {
  if (!view || typeof view !== "object") return null;

  const position = normalizeNumericArray(
    view.position || view.cameraPosition,
    3,
  );
  const target = normalizeNumericArray(view.target || view.cameraTarget, 3);

  if (!position || !target) return null;

  return {
    ...view,
    id: String(view.id || view.cameraViewId || `legacy-camera-${index + 1}`),
    caption: String(view.caption || view.label || `Camera ${index + 1}`),
    position,
    target,
    quaternion: normalizeNumericArray(
      view.quaternion || view.cameraQuaternion,
      4,
    ),
    up: normalizeNumericArray(view.up || view.cameraUp, 3),
    zoom: normalizePositiveNumber(view.zoom ?? view.cameraZoom, 1),
    fov: normalizePositiveNumber(view.fov ?? view.cameraFov, 50),
    cameraType: normalizeProjectionMode(
      view.cameraType || view.projectionMode || view.cameraProjectionMode,
    ),
    modelRotation: normalizeNumericArray(view.modelRotation, 3),
    savedAt: typeof view.savedAt === "string" ? view.savedAt : null,
  };
}

export function getChapterCameraViews(chapter) {
  const explicitViews = Array.isArray(chapter?.cameraViews)
    ? chapter.cameraViews
        .map((view, index) => normalizeChapterCameraView(view, index))
        .filter(Boolean)
    : [];

  let views = explicitViews;

  if (views.length === 0) {
    const storedView = normalizeChapterCameraView(chapter?.cameraView, 0);

    if (storedView && chapter?.cameraViewSaved !== false) {
      views = [storedView];
    }
  }

  if (views.length === 0) {
    const legacyView = normalizeChapterCameraView(
      createLegacyCameraView(chapter),
      0,
    );

    if (legacyView) views = [legacyView];
  }

  if (
    views.length > 0 &&
    !views[0]?.visualState &&
    chapter?.visualState &&
    typeof chapter.visualState === "object"
  ) {
    views = [
      {
        ...views[0],
        visualState: chapter.visualState,
      },
      ...views.slice(1),
    ];
  }

  return views;
}

export function getChapterCameraView(chapter, cameraViewId = null) {
  const views = getChapterCameraViews(chapter);

  if (!cameraViewId) return views[0] || null;

  return views.find((view) => view.id === cameraViewId) || views[0] || null;
}

export function getChapterCameraVisualState(
  chapter,
  cameraView = null,
) {
  if (cameraView?.visualState && typeof cameraView.visualState === "object") {
    return cameraView.visualState;
  }

  const views = getChapterCameraViews(chapter);
  const selectedView = cameraView
    ? views.find((view) => view.id === cameraView.id)
    : views[0];

  if (
    selectedView?.visualState &&
    typeof selectedView.visualState === "object"
  ) {
    return selectedView.visualState;
  }

  const primaryView = views[0] || null;
  const isPrimaryView =
    !cameraView || (primaryView && primaryView.id === cameraView.id);

  return isPrimaryView &&
    chapter?.visualState &&
    typeof chapter.visualState === "object"
    ? chapter.visualState
    : null;
}

export function syncChapterCameraViews(chapter, cameraViews) {
  const normalizedViews = (Array.isArray(cameraViews) ? cameraViews : [])
    .map((view, index) => normalizeChapterCameraView(view, index))
    .filter(Boolean)
    .map((view, index) => ({
      ...view,
      caption: String(view.caption || `Camera ${index + 1}`),
    }));

  const primaryView = normalizedViews[0] || null;

  return {
    ...chapter,
    cameraViews: normalizedViews,
    cameraViewSaved: normalizedViews.length > 0,
    cameraView: primaryView,
    cameraPosition: primaryView?.position || null,
    cameraTarget: primaryView?.target || null,
    cameraQuaternion: primaryView?.quaternion || null,
    cameraUp: primaryView?.up || null,
    cameraZoom: primaryView?.zoom ?? null,
    cameraType: primaryView?.cameraType || null,
    cameraFov: primaryView?.fov ?? null,
    modelRotation: primaryView?.modelRotation || null,
    visualState: primaryView?.visualState || null,
  };
}
