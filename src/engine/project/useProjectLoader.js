import { useCallback, useEffect, useRef, useState } from "react";
import {
  getProjectFromIndexedDb,
  getProjectFileFromIndexedDb,
  getProjectDraftFromIndexedDb,
  updateProjectInIndexedDb,
  saveProjectToIndexedDb,
} from "../../modules/project-hub/storage/projectIndexedDb";

const OBJECT_URL_RELEASE_DELAY_MS = 15000;

async function readProjectWithCompatibilityFallback(projectId) {
  try {
    return await getProjectFromIndexedDb(projectId, { mode: "summary" });
  } catch (summaryError) {
    console.warn(
      "Partial project read failed; retrying with full legacy hydration.",
      summaryError,
    );

    return getProjectFromIndexedDb(projectId, { mode: "full" });
  }
}

async function readDraftWithCompatibilityFallback(projectId) {
  try {
    return await getProjectDraftFromIndexedDb(projectId, {
      mode: "summary",
    });
  } catch (summaryError) {
    console.warn(
      "Partial draft read failed; retrying with full legacy hydration.",
      summaryError,
    );

    try {
      return await getProjectDraftFromIndexedDb(projectId, {
        mode: "full",
      });
    } catch (fullError) {
      console.warn(
        "Legacy draft could not be loaded; the saved project will be used.",
        fullError,
      );
      return null;
    }
  }
}

function createLoadedProjectSnapshot({ storedProject, fileData, initialDraft, objectUrl }) {
  const normalizedProjectId = storedProject.id;
  const normalizedProjectName = storedProject.name || "Untitled Project";
  const normalizedFileName =
    fileData.fileName || storedProject.fileName || "model.glb";

  return {
    project: storedProject,
    projectFile: fileData.blob,
    projectDraft: initialDraft,

    projectId: normalizedProjectId,
    projectName: normalizedProjectName,
    glbUrl: objectUrl,
    glbFileName: normalizedFileName,

    material: initialDraft.material || storedProject.material || null,
    viewer: initialDraft.viewer || storedProject.viewer || null,
    scene: initialDraft.scene || storedProject.scene || null,
  };
}

export default function useProjectLoader() {
  const objectUrlRef = useRef(null);
  const loadedSnapshotRef = useRef(null);
  const activeLoadRef = useRef({ projectId: null, promise: null });
  const loadSequenceRef = useRef(0);
  const revokeTimersRef = useRef(new Set());

  const [project, setProject] = useState(null);
  const [projectFile, setProjectFile] = useState(null);
  const [projectDraft, setProjectDraft] = useState(null);

  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [glbUrl, setGlbUrl] = useState(null);
  const [glbFileName, setGlbFileName] = useState("");

  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const scheduleObjectUrlRevocation = useCallback((url) => {
    if (!url) return;

    const timer = globalThis.setTimeout(() => {
      URL.revokeObjectURL(url);
      revokeTimersRef.current.delete(timer);
    }, OBJECT_URL_RELEASE_DELAY_MS);

    revokeTimersRef.current.add(timer);
  }, []);

  const releaseCurrentObjectUrl = useCallback(() => {
    const currentUrl = objectUrlRef.current;
    objectUrlRef.current = null;

    if (currentUrl) {
      // GLTFLoader can still be decoding embedded images when React starts a
      // replacement load or unmounts the scene. Delayed release prevents the
      // active blob resource from disappearing during that final decode phase.
      scheduleObjectUrlRevocation(currentUrl);
    }
  }, [scheduleObjectUrlRevocation]);

  const applySnapshotToState = useCallback((snapshot) => {
    setProject(snapshot.project);
    setProjectFile(snapshot.projectFile);
    setProjectDraft(snapshot.projectDraft);

    setProjectId(snapshot.projectId);
    setProjectName(snapshot.projectName);
    setGlbUrl(snapshot.glbUrl);
    setGlbFileName(snapshot.glbFileName);
  }, []);

  const loadProject = useCallback(
    async (id, { force = false } = {}) => {
      if (!id || id === "demo") {
        setLoadError("Project ID tidak valid.");
        return null;
      }

      if (!force && loadedSnapshotRef.current?.projectId === id) {
        return loadedSnapshotRef.current;
      }

      if (!force && activeLoadRef.current.projectId === id) {
        return activeLoadRef.current.promise;
      }

      const loadSequence = ++loadSequenceRef.current;
      setIsLoadingProject(true);
      setLoadError(null);

      const loadPromise = (async () => {
        try {
          const storedProject = await readProjectWithCompatibilityFallback(id);

          if (!storedProject) {
            throw new Error("Project tidak ditemukan di IndexedDB.");
          }

          const fileData = await getProjectFileFromIndexedDb(id);

          if (!(fileData?.blob instanceof Blob) || fileData.blob.size <= 0) {
            throw new Error("File GLB project tidak ditemukan atau kosong.");
          }

          updateProjectInIndexedDb(storedProject.id, {
            metadata: {
              ...(storedProject.metadata || {}),
              lastOpenedAt: new Date().toISOString(),
            },
          }).catch((error) => {
            console.warn("Unable to update project last-opened time", error);
          });

          const savedDraft = await readDraftWithCompatibilityFallback(id);

          if (loadSequence !== loadSequenceRef.current) {
            return null;
          }

          const initialDraft = savedDraft || {
            projectId: storedProject.id,
            material: storedProject.material || null,
            viewer: storedProject.viewer || null,
            scene: storedProject.scene || null,
            updatedAt: new Date().toISOString(),
          };

          const objectUrl = URL.createObjectURL(fileData.blob);
          const previousUrl = objectUrlRef.current;
          objectUrlRef.current = objectUrl;

          if (previousUrl && previousUrl !== objectUrl) {
            scheduleObjectUrlRevocation(previousUrl);
          }

          const snapshot = createLoadedProjectSnapshot({
            storedProject,
            fileData,
            initialDraft,
            objectUrl,
          });

          loadedSnapshotRef.current = snapshot;

          if (loadSequence === loadSequenceRef.current) {
            applySnapshotToState(snapshot);
          }

          return snapshot;
        } catch (error) {
          console.error("Failed to load project:", error);

          if (loadSequence === loadSequenceRef.current) {
            setLoadError(error.message || "Gagal memuat project.");
          }

          return null;
        } finally {
          if (loadSequence === loadSequenceRef.current) {
            setIsLoadingProject(false);
          }
        }
      })();

      activeLoadRef.current = { projectId: id, promise: loadPromise };

      try {
        return await loadPromise;
      } finally {
        if (activeLoadRef.current.promise === loadPromise) {
          activeLoadRef.current = { projectId: null, promise: null };
        }
      }
    },
    [applySnapshotToState, scheduleObjectUrlRevocation],
  );

  const updateProject = useCallback(async (updatedProject, file) => {
    if (!updatedProject?.id) return null;

    await saveProjectToIndexedDb(updatedProject, file);
    setProject(updatedProject);

    if (loadedSnapshotRef.current?.projectId === updatedProject.id) {
      loadedSnapshotRef.current = {
        ...loadedSnapshotRef.current,
        project: updatedProject,
        projectFile: file || loadedSnapshotRef.current.projectFile,
      };
    }

    return updatedProject;
  }, []);

  const clearLoadedProject = useCallback(() => {
    loadSequenceRef.current += 1;
    activeLoadRef.current = { projectId: null, promise: null };
    loadedSnapshotRef.current = null;
    releaseCurrentObjectUrl();

    setProject(null);
    setProjectFile(null);
    setProjectDraft(null);
    setProjectId(null);
    setProjectName("");
    setGlbUrl(null);
    setGlbFileName("");
    setLoadError(null);
    setIsLoadingProject(false);
  }, [releaseCurrentObjectUrl]);

  useEffect(() => {
    return () => {
      loadSequenceRef.current += 1;
      releaseCurrentObjectUrl();
    };
  }, [releaseCurrentObjectUrl]);

  return {
    project,
    projectFile,
    projectDraft,
    projectId,
    projectName,
    glbUrl,
    glbFileName,
    isLoadingProject,
    loadError,
    loadProject,
    updateProject,
    clearLoadedProject,
  };
}
