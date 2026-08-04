import { useCallback, useEffect, useRef, useState } from "react";
import {
  getProjectFromIndexedDb,
  getProjectFileFromIndexedDb,
  getProjectDraftFromIndexedDb,
  updateProjectInIndexedDb,
  saveProjectToIndexedDb,
} from "../../modules/project-hub/storage/projectIndexedDb";
import {
  fetchContentMediaBlob,
  findContentModelMedia,
} from "../../modules/project-hub/api/contentMedia";

export default function useProjectLoader() {
  const objectUrlRef = useRef(null);

  const [project, setProject] = useState(null);
  const [projectFile, setProjectFile] = useState(null);
  const [projectDraft, setProjectDraft] = useState(null);

  const [projectId, setProjectId] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [glbUrl, setGlbUrl] = useState(null);
  const [glbFileName, setGlbFileName] = useState("");

  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const revokeCurrentObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const loadProject = useCallback(
    async (id, { onDownloadProgress } = {}) => {
      if (!id || id === "demo") {
        setLoadError("Project ID tidak valid.");
        return null;
      }

      setIsLoadingProject(true);
      setLoadError(null);

      try {
        revokeCurrentObjectUrl();

        const storedProject = await getProjectFromIndexedDb(id);

        if (!storedProject) {
          throw new Error("Project tidak ditemukan di IndexedDB.");
        }

        await updateProjectInIndexedDb(storedProject.id, {
          metadata: {
            ...(storedProject.metadata || {}),
            lastOpenedAt: new Date().toISOString(),
          },
        });

        let fileData = await getProjectFileFromIndexedDb(id);

        // The local blob stays the primary source — fast, and works
        // offline. It's only missing when this project was never fully
        // downloaded to this browser (e.g. opened via a cloud-only content
        // link, or hydrated from the backend without its GLB). In that
        // case: retrieve it once from the backend (server reads it from
        // R2/local storage and hands back the bytes — see
        // GET /content-media/stream) and cache it into IndexedDB, so every
        // open after this one uses the fast local path instead of
        // re-fetching over the network.
        if (!fileData?.blob && storedProject.remote?.contentId) {
          const modelMedia = await findContentModelMedia({
            contentId: storedProject.remote.contentId,
          });

          if (modelMedia) {
            const blob = await fetchContentMediaBlob({
              id: modelMedia.id,
              onProgress: onDownloadProgress,
            });
            const cachedFileName =
              modelMedia.filename || storedProject.fileName || "model.glb";
            const fileForCache = new File([blob], cachedFileName, {
              type: modelMedia.mimetype || blob.type || "model/gltf-binary",
            });

            await saveProjectToIndexedDb(storedProject, fileForCache);
            fileData = { blob: fileForCache, fileName: cachedFileName };
          }
        }

        if (!fileData?.blob) {
          throw new Error("File GLB project tidak ditemukan.");
        }

        const resolvedGlbUrl = URL.createObjectURL(fileData.blob);
        objectUrlRef.current = resolvedGlbUrl;
        const resolvedFileName =
          fileData.fileName || storedProject.fileName || "model.glb";

        const savedDraft = await getProjectDraftFromIndexedDb(id);

        const initialDraft = savedDraft || {
          projectId: storedProject.id,
          material: storedProject.material || null,
          viewer: storedProject.viewer || null,
          scene: storedProject.scene || null,
          updatedAt: new Date().toISOString(),
        };

        const normalizedProjectId = storedProject.id;
        const normalizedProjectName = storedProject.name || "Untitled Project";

        setProject(storedProject);
        setProjectFile(fileData?.blob || null);
        setProjectDraft(initialDraft);

        setProjectId(normalizedProjectId);
        setProjectName(normalizedProjectName);
        setGlbUrl(resolvedGlbUrl);
        setGlbFileName(resolvedFileName);

        return {
          project: storedProject,
          projectFile: fileData?.blob || null,
          projectDraft: initialDraft,

          projectId: normalizedProjectId,
          projectName: normalizedProjectName,
          glbUrl: resolvedGlbUrl,
          glbFileName: resolvedFileName,

          material: initialDraft.material || storedProject.material || null,
          viewer: initialDraft.viewer || storedProject.viewer || null,
          scene: initialDraft.scene || storedProject.scene || null,
        };
      } catch (error) {
        console.error("Failed to load project:", error);
        setLoadError(error.message || "Gagal memuat project.");
        return null;
      } finally {
        setIsLoadingProject(false);
      }
    },
    [revokeCurrentObjectUrl]
  );

  const updateProject = useCallback(async (updatedProject, file) => {
    if (!updatedProject?.id) return null;

    await saveProjectToIndexedDb(updatedProject, file);
    setProject(updatedProject);

    return updatedProject;
  }, []);

  const clearLoadedProject = useCallback(() => {
    revokeCurrentObjectUrl();

    setProject(null);
    setProjectFile(null);
    setProjectDraft(null);

    setProjectId(null);
    setProjectName("");
    setGlbUrl(null);
    setGlbFileName("");

    setLoadError(null);
    setIsLoadingProject(false);
  }, [revokeCurrentObjectUrl]);

  useEffect(() => {
    return () => {
      revokeCurrentObjectUrl();
    };
  }, [revokeCurrentObjectUrl]);

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