import { useEffect, useRef } from "react";
import {
  saveProjectDraftToIndexedDb,
  updateProjectInIndexedDb,
} from "../modules/project-hub/storage/projectIndexedDb";
// Autosave used to push every local save straight to the backend in the
// background (best-effort, via remoteContentId below). Per the user's
// request, local saves now stay local-only — backend sync only happens when
// the user presses "Bulk Update" in EditorTopBar, which calls
// syncProjectToBackend directly (see useViewerPageController.handleBulkUpdate).
// import { syncProjectToBackend } from "../modules/project-hub/api/projectSync";

export function createViewerDraft({
  projectId,
  material,
  viewerSettings,
  markers,
  cutEnabled,
  cutAxis,
  cutValue,
  cutValues,
  cutRanges,
  previousScene = {},
}) {
  return {
    projectId,
    material,
    viewer: viewerSettings,
    scene: {
      ...(previousScene || {}),
      markers,
      cut: {
        enabled: cutEnabled,
        axis: cutAxis,
        value: cutValue,
        values: cutValues || null,
        ranges: cutRanges || null,
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

export function useViewerAutosave({
  projectId,
  dirty,
  material,
  viewerSettings,
  markers,
  cutEnabled,
  cutAxis,
  cutValue,
  cutValues,
  cutRanges,
  previousScene,
  setSaveStatus,
  markSaved,
  markSaveError,
  setProjectDraft,
  // remoteContentId used to trigger an automatic background push to the
  // backend on every autosave. That's now handled manually via the "Bulk
  // Update" button instead (see useViewerPageController.handleBulkUpdate),
  // so it's no longer read here.
  // remoteContentId,
}) {
  const previousSceneRef = useRef(previousScene || {});

  useEffect(() => {
    previousSceneRef.current = previousScene || {};
  }, [previousScene]);

  useEffect(() => {
    if (!projectId || projectId === "demo") return;
    if (!material?.projectId) return;
    if (!dirty) return;

    setSaveStatus("saving");

    const timer = setTimeout(async () => {
      try {
        const draftToSave = createViewerDraft({
          projectId,
          material,
          viewerSettings,
          markers,
          cutEnabled,
          cutAxis,
          cutValue,
          cutValues,
          cutRanges,
          previousScene: previousSceneRef.current,
        });

        await saveProjectDraftToIndexedDb(projectId, draftToSave);

        await updateProjectInIndexedDb(projectId, {
          thumbnail: material?.thumbnail || null,
          material,
          viewer: viewerSettings,
          scene: draftToSave.scene,
        });

        setProjectDraft(draftToSave);

        markSaved();

        // Backend sync no longer fires automatically here — see the
        // commented remoteContentId note above. It only happens when the
        // user presses "Bulk Update".
      } catch (error) {
        console.error("Autosave gagal:", error);
        markSaveError();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    projectId,
    dirty,
    material,
    markers,
    viewerSettings,
    cutEnabled,
    cutAxis,
    cutValue,
    cutValues,
    cutRanges,
    setSaveStatus,
    markSaved,
    markSaveError,
    setProjectDraft,
  ]);

  useEffect(() => {
    if (!projectId || projectId === "demo") return;
    if (!material?.projectId) return;

    setProjectDraft((prev) =>
      createViewerDraft({
        projectId,
        material,
        viewerSettings,
        markers,
        cutEnabled,
        cutAxis,
        cutValue,
        cutValues,
        cutRanges,
        previousScene: {
          ...previousSceneRef.current,
          ...(prev?.scene || {}),
        },
      })
    );
  }, [
    projectId,
    material,
    viewerSettings,
    markers,
    cutEnabled,
    cutAxis,
    cutValue,
    cutValues,
    cutRanges,
    setProjectDraft,
  ]);
}
