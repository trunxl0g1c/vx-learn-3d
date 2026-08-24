import { useEffect, useLayoutEffect, useRef } from "react";
import { enqueueProjectWrite } from "../modules/project-hub/storage/projectWriteCoordinator";
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
  previousScene,
  setSaveStatus,
  markSaved,
  markSaveError,
  setProjectDraft,
}) {
  const previousSceneRef = useRef(previousScene || {});
  const saveRevisionRef = useRef(0);
  const mountedRef = useRef(true);

  useLayoutEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      // Invalidate any queued work owned by this ViewerPage instance so it
      // cannot mutate the global ProjectStore after the editor has unmounted.
      saveRevisionRef.current += 1;
    };
  }, []);

  useEffect(() => {
    previousSceneRef.current = previousScene || {};
  }, [previousScene]);

  useEffect(() => {
    // Every relevant state change invalidates an older in-flight autosave.
    // This prevents an older save from clearing `dirty` and cancelling the
    // debounce timer that belongs to newer Chapter/Slide/Flow/Animation edits.
    const revision = saveRevisionRef.current + 1;
    saveRevisionRef.current = revision;

    if (!projectId || projectId === "demo") return;
    if (material?.projectId !== projectId) return;
    if (!dirty) return;

    setSaveStatus("saving");

    const timer = setTimeout(() => {
      const runSave = async () => {
        // A newer edit may have happened while this save was waiting in the
        // serialized queue. In that case there is no reason to persist the
        // stale snapshot at all.
        if (!mountedRef.current || revision !== saveRevisionRef.current) return;

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

          // Never let a completed stale save mark the project as clean or
          // replace the current draft. A newer queued save owns that state.
          if (!mountedRef.current || revision !== saveRevisionRef.current) return;

          setProjectDraft(draftToSave);
          markSaved();
        } catch (error) {
          console.error("Autosave gagal:", error);
          if (mountedRef.current && revision === saveRevisionRef.current) {
            markSaveError();
          }
        }
      };

      // Queue by project at module scope, not by hook instance. This keeps the
      // write order intact across A -> Dashboard -> B -> A navigation.
      void enqueueProjectWrite(projectId, runSave).catch((error) => {
        console.error("Autosave queue gagal:", error);
      });
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
    if (material?.projectId !== projectId) return;

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
