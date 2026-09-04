import { useCallback, useState } from "react";
import { useAlert } from "../../components/dialog/AlertContext";
import {
  importViqubedDataOnly,
  isViqubedDataFile,
} from "../../utils/vxpackUtils";
import {
  saveProjectDraftToIndexedDb,
  updateProjectInIndexedDb,
} from "../../modules/project-hub/storage/projectIndexedDb";
import {
  createImportedMaterialForCurrentProject,
  createViqubedDataImportSummary,
  normalizeImportedScene,
} from "../../engine/project/ViqubedDataImport";
import { normalizeLoadedViewerSettings } from "./normalizeViewerSettings";

export function useViewerDataImport({
  projectId,
  currentProject,
  projectDraft,
  material,
  viewerSettings,
  rawSetMaterial,
  setViewerSettings,
  setCameraProjectionMode,
  setMarkers,
  setCutEnabled,
  setCutAxis,
  setCutValue,
  setCutValues,
  setCutRanges,
  setActiveChapterId,
  setRightTab,
  setCurrentProject,
  setProjectDraft,
  setSaveStatus,
  markSaved,
  markSaveError,
  updateLoading,
  hideLoading,
}) {
  const { showAlert } = useAlert();
  const [isImportingData, setIsImportingData] = useState(false);
  const [importDataStatus, setImportDataStatus] = useState("");

  const importDataFile = useCallback(
    async (file) => {
      if (!file || isImportingData) return false;

      if (!isViqubedDataFile(file)) {
        showAlert({
          title: "Invalid Data File",
          message: "Select a VIQUBED data package with the .viqdata extension.",
          type: "error",
        });
        return false;
      }

      setIsImportingData(true);
      setImportDataStatus("Reading VIQUBED data...");
      setSaveStatus?.("saving");
      updateLoading?.({
        title: "Importing VIQUBED Data",
        text: "Reading data package...",
        progress: null,
      });

      try {
        const imported = await importViqubedDataOnly(file);
        const nextMaterial = createImportedMaterialForCurrentProject({
          currentMaterial: material,
          importedMaterial: imported.material,
          projectId,
          projectName: currentProject?.name,
        });
        const nextViewer = normalizeLoadedViewerSettings({
          ...(viewerSettings || {}),
          ...(imported.viewer || {}),
          background: {
            ...(viewerSettings?.background || {}),
            ...(imported.viewer?.background || {}),
          },
        });
        const nextScene = normalizeImportedScene(imported.scene, {
          ...(currentProject?.scene || {}),
          ...(projectDraft?.scene || {}),
        });
        const importedAt = new Date().toISOString();
        const nextDraft = {
          ...(projectDraft || {}),
          projectId,
          material: nextMaterial,
          viewer: nextViewer,
          scene: nextScene,
          updatedAt: importedAt,
          dataImport: {
            fileName: file.name,
            importedAt,
            sourceModel: imported.sourceModel || null,
          },
        };

        setImportDataStatus("Saving imported content...");
        updateLoading?.({
          title: "Importing VIQUBED Data",
          text: "Saving imported chapters, slides, flows, animations, procedures, and quizzes...",
          progress: null,
        });

        if (projectId && projectId !== "demo") {
          await saveProjectDraftToIndexedDb(projectId, nextDraft);
          await updateProjectInIndexedDb(projectId, {
            thumbnail: nextMaterial?.thumbnail || currentProject?.thumbnail || null,
            material: nextMaterial,
            viewer: nextViewer,
            scene: nextScene,
            metadata: {
              dataImportedAt: importedAt,
              dataImportFileName: file.name,
            },
          });
        }

        rawSetMaterial(nextMaterial);
        setViewerSettings(nextViewer);
        setCameraProjectionMode?.(nextViewer.cameraProjectionMode);
        setMarkers(Array.isArray(nextScene.markers) ? nextScene.markers : []);
        setCutEnabled(nextScene.cut.enabled);
        setCutAxis(nextScene.cut.axis);
        setCutValue(nextScene.cut.value);
        setCutValues(nextScene.cut.values);
        setCutRanges(nextScene.cut.ranges);
        setActiveChapterId(null);
        setRightTab("material");
        setProjectDraft(nextDraft);
        setCurrentProject((previousProject) => ({
          ...(previousProject || {}),
          material: nextMaterial,
          viewer: nextViewer,
          scene: nextScene,
          thumbnail:
            nextMaterial?.thumbnail || previousProject?.thumbnail || null,
        }));
        markSaved?.();
        setImportDataStatus("Data imported successfully");
        hideLoading?.();

        showAlert({
          title: "Data Imported",
          message: `${createViqubedDataImportSummary({
            material: nextMaterial,
            sourceModel: imported.sourceModel,
          })} Object references were preserved and may need remapping when the new GLB hierarchy is different.`,
          type: "success",
        });

        return true;
      } catch (error) {
        console.error("Failed to import VIQUBED data:", error);
        markSaveError?.();
        setImportDataStatus(error?.message || "Failed to import data");
        hideLoading?.();
        showAlert({
          title: "Import Failed",
          message: error?.message || "The VIQUBED data file could not be imported.",
          type: "error",
        });
        return false;
      } finally {
        setIsImportingData(false);
      }
    },
    [
      currentProject,
      hideLoading,
      isImportingData,
      markSaveError,
      markSaved,
      material,
      projectDraft,
      projectId,
      rawSetMaterial,
      setActiveChapterId,
      setCameraProjectionMode,
      setCurrentProject,
      setCutAxis,
      setCutEnabled,
      setCutRanges,
      setCutValue,
      setCutValues,
      setMarkers,
      setProjectDraft,
      setRightTab,
      setSaveStatus,
      setViewerSettings,
      showAlert,
      updateLoading,
      viewerSettings,
    ],
  );

  return {
    importDataFile,
    isImportingData,
    importDataStatus,
  };
}

export default useViewerDataImport;
