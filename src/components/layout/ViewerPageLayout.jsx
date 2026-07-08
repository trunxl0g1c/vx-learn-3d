import EditorRightPanel from "../panels/EditorRightPanel";
import EditorTopBar from "./EditorTopBar";
import EditorSidebarRail from "../sidebar/EditorSidebarRail";
import EditorViewport from "./EditorViewport";
import MarkerDialog from "../panels/chapter/MarkerDialog";
import { Activity } from "react";

export default function ViewerPageLayout({ controller }) {
  const {
    saveStatus,
    activeSidebar,
    setActiveSidebar,
    rightTab,
    setRightTab,
    selectedObjectName,
    createChapterFromSelectedObject,
    saveCameraViewToActiveChapter,
    saveMaterial,
    isSavingPackage,
    savePackageProgress,
    savePackageStatus,
    applyShaderMode,
    shaderMode,
    metalness,
    setMetalness,
    roughness,
    setRoughness,
    viewerSettings,
    setViewerSettings,
    updateEnvIntensity,
    material,
    activeChapterId,
    setActiveChapterId,
    panelSectionStyle,
    inputStyle,
    mediaButtonStyle,
    updateChapterField,
    addChapterParameter,
    updateChapterParameter,
    deleteChapterParameter,
    deleteMarkerFromActiveChapter,
    animations,
    selectedAnimations,
    setSelectedAnimations,
    setAnimationCommand,
    isChapterAnimationSelected,
    getChapterAnimationConfig,
    toggleChapterAnimation,
    updateChapterAnimationField,
    playAnimationPreview,
    stopAnimationPreview,
    addChapterMedia,
    deleteChapterMedia,
    setMarkerMode,
    markerDialogOpen,
    pendingMarkerName,
    setPendingMarkerName,
    confirmMarkerDialog,
    requestAddMarker,
    markerMode,
    cancelAddMarker,

    hideSelectedObject,
    deselectObject,
  } = controller;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#0b1220",
        color: "white",
        position: "relative",
      }}
    >
      <EditorTopBar
        title={material.title}
        saveStatus={saveStatus}
        onPlay={controller.openPlayerPreview}
      />

      <EditorSidebarRail
        activeSidebar={activeSidebar}
        setActiveSidebar={setActiveSidebar}
      />

      <Activity mode={selectedObjectName ? "visible" : "hidden"}>
        <EditorRightPanel
          rightTab={rightTab}
          setRightTab={setRightTab}
          selectedObjectName={selectedObjectName}
          createChapterFromSelectedObject={createChapterFromSelectedObject}
          saveCameraViewToActiveChapter={saveCameraViewToActiveChapter}
          saveMaterial={saveMaterial}
          isSavingPackage={isSavingPackage}
          savePackageProgress={savePackageProgress}
          savePackageStatus={savePackageStatus}
          applyShaderMode={applyShaderMode}
          shaderMode={shaderMode}
          metalness={metalness}
          setMetalness={setMetalness}
          roughness={roughness}
          setRoughness={setRoughness}
          viewerSettings={viewerSettings}
          setViewerSettings={setViewerSettings}
          updateEnvIntensity={updateEnvIntensity}
          material={material}
          activeChapterId={activeChapterId}
          setActiveChapterId={setActiveChapterId}
          panelSectionStyle={panelSectionStyle}
          inputStyle={inputStyle}
          mediaButtonStyle={mediaButtonStyle}
          updateChapterField={updateChapterField}
          addChapterParameter={addChapterParameter}
          updateChapterParameter={updateChapterParameter}
          deleteChapterParameter={deleteChapterParameter}
          deleteMarkerFromActiveChapter={deleteMarkerFromActiveChapter}
          animations={animations}
          selectedAnimations={selectedAnimations}
          setSelectedAnimations={setSelectedAnimations}
          setAnimationCommand={setAnimationCommand}
          isChapterAnimationSelected={isChapterAnimationSelected}
          getChapterAnimationConfig={getChapterAnimationConfig}
          toggleChapterAnimation={toggleChapterAnimation}
          updateChapterAnimationField={updateChapterAnimationField}
          playAnimationPreview={playAnimationPreview}
          stopAnimationPreview={stopAnimationPreview}
          addChapterMedia={addChapterMedia}
          deleteChapterMedia={deleteChapterMedia}
          setMarkerMode={setMarkerMode}
          requestAddMarker={requestAddMarker}
          markerMode={markerMode}
          cancelAddMarker={cancelAddMarker}
          hideSelectedObject={controller.hideSelectedObject}
          soloSelectedObject={controller.soloSelectedObject}
          resetAllTransforms={controller.resetAllTransforms}
          deselectObject={controller.deselectObject}
        />
      </Activity>

      <EditorViewport controller={controller} />

      <MarkerDialog
        open={markerDialogOpen}
        value={pendingMarkerName}
        onChange={setPendingMarkerName}
        onClose={cancelAddMarker}
        onSubmit={confirmMarkerDialog}
      />
    </div>
  );
}
