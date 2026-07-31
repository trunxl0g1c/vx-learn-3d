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
    selectedObject,
    selectedObjectName,
    authoringObjectName,
    createChapterFromSelectedObject,
    previewChapterInEditor,
    contentAuthoringLocked,
    contentAuthoringLockReason,
    saveVisualStateToActiveChapter,
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
    modelScene,
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
    addChapterAnimation,
    updateChapterAnimation,
    removeChapterAnimation,
    addChapterFlow,
    updateChapterFlow,
    removeChapterFlow,
    playAnimationPreview,
    stopAnimationPreview,
    addChapterMedia,
    deleteChapterMedia,
    deleteChapterContent,
    moveChapter,
    setMarkerMode,
    markerDialogOpen,
    pendingMarkerName,
    setPendingMarkerName,
    confirmMarkerDialog,
    requestAddMarker,
    markerMode,
    cancelAddMarker,

    hideSelectedObject,
    toggleSelectedObjectXray,
    isSelectedObjectXray,
    deselectObject,

    activeMarkers,
    deleteCameraViewFromActiveChapter,
    deleteVisualStateFromActiveChapter,

    chapterFeedback,
    clearChapterFeedback,
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
        onExport={saveMaterial}
        isExporting={isSavingPackage}
        exportProgress={savePackageProgress}
        exportStatus={savePackageStatus}
      />

      <EditorSidebarRail
        activeSidebar={activeSidebar}
        setActiveSidebar={setActiveSidebar}
      />

      <Activity
        mode={
          selectedObjectName || rightTab === "chapter" || activeChapterId
            ? "visible"
            : "hidden"
        }
      >
        <EditorRightPanel
          chapterFeedback={chapterFeedback}
          clearChapterFeedback={clearChapterFeedback}
          rightTab={rightTab}
          setRightTab={setRightTab}
          selectedObject={selectedObject}
          selectedObjectName={selectedObjectName}
          authoringObjectName={authoringObjectName}
          createChapterFromSelectedObject={createChapterFromSelectedObject}
          previewChapterInEditor={previewChapterInEditor}
          contentAuthoringLocked={contentAuthoringLocked}
          contentAuthoringLockReason={contentAuthoringLockReason}
          saveVisualStateToActiveChapter={saveVisualStateToActiveChapter}
          saveCameraViewToActiveChapter={saveCameraViewToActiveChapter}
          applyShaderMode={applyShaderMode}
          shaderMode={shaderMode}
          metalness={metalness}
          setMetalness={setMetalness}
          roughness={roughness}
          setRoughness={setRoughness}
          viewerSettings={viewerSettings}
          setViewerSettings={setViewerSettings}
          modelScene={modelScene}
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
          addChapterAnimation={addChapterAnimation}
          updateChapterAnimation={updateChapterAnimation}
          removeChapterAnimation={removeChapterAnimation}
          addChapterFlow={addChapterFlow}
          updateChapterFlow={updateChapterFlow}
          removeChapterFlow={removeChapterFlow}
          playAnimationPreview={playAnimationPreview}
          stopAnimationPreview={stopAnimationPreview}
          addChapterMedia={addChapterMedia}
          deleteChapterMedia={deleteChapterMedia}
          deleteChapterContent={deleteChapterContent}
          moveChapter={moveChapter}
          setMarkerMode={setMarkerMode}
          requestAddMarker={requestAddMarker}
          markerMode={markerMode}
          cancelAddMarker={cancelAddMarker}
          hideSelectedObject={controller.hideSelectedObject}
          soloSelectedObject={controller.soloSelectedObject}
          toggleSelectedObjectXray={toggleSelectedObjectXray}
          isSelectedObjectXray={isSelectedObjectXray}
          resetAllTransforms={controller.resetAllTransforms}
          deselectObject={controller.deselectObject}
          deleteVisualStateFromActiveChapter={
            deleteVisualStateFromActiveChapter
          }
          deleteCameraViewFromActiveChapter={deleteCameraViewFromActiveChapter}
          leftPanelOpen={Boolean(activeSidebar)}
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
