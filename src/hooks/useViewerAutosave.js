import { useEffect } from "react";
import { saveProjectDraftToIndexedDb } from "../modules/project-hub/storage/projectIndexedDb";

export function createViewerDraft({
  projectId,
  material,
  viewerSettings,
  markers,
  cutEnabled,
  cutAxis,
  cutValue,
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
  setSaveStatus,
  markSaved,
  markSaveError,
  setProjectDraft,
}) {
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
        });

        await saveProjectDraftToIndexedDb(projectId, draftToSave);
        setProjectDraft(draftToSave);

        markSaved();
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
        previousScene: prev?.scene,
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
    setProjectDraft,
  ]);
}
