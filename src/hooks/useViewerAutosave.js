import { useEffect } from "react";
import {
  saveProjectDraftToIndexedDb,
  updateProjectInIndexedDb,
} from "../modules/project-hub/storage/projectIndexedDb";

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
          cutValues,
          cutRanges,
        });

        await saveProjectDraftToIndexedDb(projectId, draftToSave);

        await updateProjectInIndexedDb(projectId, {
          thumbnail: material?.thumbnail || null,
          material,
          viewer: viewerSettings,
        });

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
    cutValues,
    cutRanges,
    setProjectDraft,
  ]);
}
