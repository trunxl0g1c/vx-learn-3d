import SceneCanvas from "../canvas/SceneCanvas";
import EditorFloatingToolbar from "../toolbar/EditorFloatingToolbar";
import CutSectionSlider from "../toolbar/CutSectionSlider";
import EditorLeftSidebar from "../sidebar/EditorLeftSidebar";
import AnimationWorkspaceDock from "../animation/AnimationWorkspaceDock";
import QuizWorkspaceDock from "../quiz/QuizWorkspaceDock";
import XRWorkspaceDock from "../xr/XRWorkspaceDock";
import SelectedObjectBadge from "./SelectedObjectBadge";
import EditorSceneViewGizmo from "../viewer/EditorSceneViewGizmo";
import { viewportStyle } from "../../constants/viewerStyles";

export default function EditorViewport({ controller }) {
  const {
    activeSidebar,
    setActiveSidebar,
    selectedObjectName,
    setActiveMenu,
    activeMenu,

    cameraRef,
    controlsRef,
    focusTargetRef,
    setEditorCameraView,
    setEditorCameraProjectionMode,

    outlineObjects,
    shaderOutlineObjects,
    shaderOutlineStyle,
    modelUrl,
    handleModelLoaded,
    markerMode,
    setMarkerMode,
    selectObjectFromMesh,
    focusObjectFromMesh,

    selectedAnimations,
    setSelectedAnimations,
    animationCommand,
    setAnimationCommand,

    activeMarkers,
    activeChapter,
    updateMarker,
    modelScene,
    targetRotationY,
    isAutoRotating,
    setIsAutoRotating,

    selectedObject,
    selectedObjects,
    multipleSelectEnabled,
    blinkSelectedObjectsEnabled,
    toggleBlinkSelectedObjects,
    toggleMultipleSelect,
    clearSelection,
    clearSelectionFromViewport,
    selectObjectFromList,
    isTransforming,
    setIsTransforming,
    orbitEnabled,
    setOrbitEnabled,
    setSelectedObject,
    setOutlineObjects,
    setSelectedObjectName,
    beginObjectTransformHistory,
    commitObjectTransformHistory,

    cutEnabled,
    cutValues,
    cutRanges,
    updateCutValue,
    resetCutValues,
    cutAllObjects,
    setCutAllObjects,
    cutTargetAvailable,

    handleFile,
    toggleCutSection,
    hideSelectedObject,
    hideMultipleSelectedObjects,
    makeSelectedObjectsXray,
    resetXray,
    pullApart,
    resetAllTransforms,
    soloSelectedObject,
    showAllObjects,

    objectList,
    highlightObject,
    makeXrayExcept,
    focusObject,
    markers,

    treeDepth,
    setTreeDepth,
    maxTreeDepth,
    searchObject,
    setSearchObject,
    hideAllObjects,
    renameObject,

    material,
    setMaterial,
    saveDefaultPlayerCameraView,
    flow,
    procedural,
    animationAuthoring,
    quizAuthoring,
    xrAuthoring,
    slideAuthoring,

    applyShaderMode,
    shaderMode,
    metalness,
    setMetalness,
    roughness,
    setRoughness,
    viewerSettings,
    setViewerSettings,
    updateEnvIntensity,

    setAnimations,
    animations,

    handleMarkerPointPicked,
    setRightTab,
    rightTab,

    activeChapterId,
    setActiveChapterId,
    previewChapterInEditor,
    createChapterFromSelectedObject,
    contentAuthoringLocked,
    contentAuthoringLockReason,
    saveCameraViewToActiveChapter,
    panelSectionStyle,
    inputStyle,
    mediaButtonStyle,
    updateChapterField,
    addChapterParameter,
    updateChapterParameter,
    deleteChapterParameter,
    deleteMarkerFromActiveChapter,
    isChapterAnimationSelected,
    getChapterAnimationConfig,
    toggleChapterAnimation,
    updateChapterAnimationField,
    playAnimationPreview,
    stopAnimationPreview,
    addChapterMedia,
    deleteChapterMedia,
    moveChapter,
    requestAddMarker,
    cancelAddMarker,
  } = controller;

  const workspaceAuthoringActive = Boolean(
    animationAuthoring?.isAuthoringActive ||
      quizAuthoring?.isAuthoringActive ||
      xrAuthoring?.isAuthoringActive,
  );
  const rightPanelVisible =
    !workspaceAuthoringActive &&
    Boolean(
      slideAuthoring?.isAuthoringActive
        ? rightTab === "slide" || slideAuthoring?.activeSlideId
        : selectedObjectName || rightTab === "chapter" || activeChapterId,
    );
  const activeCameraProjectionMode =
    controller.cameraProjectionMode === "orthographic"
      ? "orthographic"
      : "perspective";


  return (
    <div onClick={() => setActiveMenu(null)} style={viewportStyle}>
      <EditorSceneViewGizmo
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        onChangeView={setEditorCameraView}
        projectionMode={activeCameraProjectionMode}
        onChangeProjectionMode={setEditorCameraProjectionMode}
        rightPanelVisible={rightPanelVisible}
      />

      <SelectedObjectBadge selectedObjectName={selectedObjectName} />

      <div
        className={
          animationAuthoring?.isAuthoringActive
            ? "absolute inset-x-0 top-0 bottom-[360px]"
            : quizAuthoring?.isAuthoringActive
              ? "absolute inset-x-0 top-0 bottom-[420px]"
              : xrAuthoring?.isAuthoringActive
                ? "absolute inset-x-0 top-0 bottom-[360px]"
                : "absolute inset-0"
        }
      >
        <SceneCanvas
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        focusTargetRef={focusTargetRef}
        viewerSettings={viewerSettings}
        cameraProjectionMode={activeCameraProjectionMode}
        outlineObjects={outlineObjects}
        blinkSelectionEnabled={blinkSelectedObjectsEnabled}
        shaderOutlineObjects={shaderOutlineObjects}
        shaderOutlineStyle={shaderOutlineStyle}
        modelUrl={modelUrl}
        // addMarker={addMarker}
        addMarker={handleMarkerPointPicked}
        handleModelLoaded={handleModelLoaded}
        markerMode={markerMode}
        selectObjectFromMesh={selectObjectFromMesh}
        focusObjectFromMesh={focusObjectFromMesh}
        selectedAnimations={selectedAnimations}
        animationCommand={animationCommand}
        setAnimations={setAnimations}
        setSelectedAnimations={setSelectedAnimations}
        activeMarkers={activeMarkers}
        activeChapter={slideAuthoring?.activeSlide || activeChapter}
        updateMarker={updateMarker}
        modelScene={modelScene}
        targetRotationY={targetRotationY}
        isAutoRotating={isAutoRotating}
        setIsAutoRotating={setIsAutoRotating}
        selectedObject={selectedObject}
        isTransforming={isTransforming}
        setIsTransforming={setIsTransforming}
        orbitEnabled={orbitEnabled}
        setOrbitEnabled={setOrbitEnabled}
        setSelectedObject={setSelectedObject}
        setOutlineObjects={setOutlineObjects}
        setSelectedObjectName={setSelectedObjectName}
        onTransformStart={beginObjectTransformHistory}
        onTransformEnd={commitObjectTransformHistory}
        onClearSelection={clearSelectionFromViewport}
        flowPointMode={flow?.pointMode}
        onAddFlowPoint={flow?.addPoint}
        onUpdateFlowPoints={flow?.updatePoints}
        selectedFlowPointIds={flow?.selectedPointIds}
        onSelectFlowPoint={flow?.selectPoint}
        authoringFlow={flow?.isAuthoringActive ? flow?.activeFlow : null}
        flowPreviewPlaying={flow?.isPreviewing}
        flowPreviewToken={flow?.previewToken}
        proceduralTransformMode={
          procedural?.isAuthoringActive
            ? procedural?.transformMode || "translate"
            : "translate"
        }
        proceduralTransformObject={
          procedural?.isAuthoringActive
            ? procedural?.activeAnimatedObject || null
            : null
        }
        proceduralAssemblyTargetTransform={
          procedural?.isAuthoringActive &&
          procedural?.activeProcedure?.type === "assembly"
            ? procedural?.activeStep?.endTransform || null
            : null
        }
        proceduralAssemblyShowGhost={
          procedural?.isAuthoringActive &&
          procedural?.activeProcedure?.type === "assembly" &&
          procedural?.activeStep?.interaction?.showGhost !== false &&
          Boolean(procedural?.activeStep?.endTransform)
        }
        animationTransformMode={
          animationAuthoring?.isAuthoringActive
            ? animationAuthoring?.transformMode || "translate"
            : "translate"
        }
        animationTransformObject={
          animationAuthoring?.isAuthoringActive &&
          animationAuthoring?.activeTrack?.rig?.type !== "hydraulic"
            ? animationAuthoring?.activeTrackObject || null
            : null
        }
        animationTransformRig={
          animationAuthoring?.isAuthoringActive
            ? animationAuthoring?.activeTrack?.rig || null
            : null
        }
        animationPivotEditEnabled={
          animationAuthoring?.isAuthoringActive
            ? animationAuthoring?.isPivotEditing === true
            : false
        }
        onAnimationTransformChange={
          animationAuthoring?.isAuthoringActive
            ? animationAuthoring?.previewActiveTrackTransform
            : null
        }
        onAnimationPivotChange={
          animationAuthoring?.isAuthoringActive
            ? animationAuthoring?.setActiveTrackRigPivot
            : null
        }
        onAnimationPivotPick={
          animationAuthoring?.isAuthoringActive
            ? animationAuthoring?.snapActiveTrackRigPivotFromHit
            : null
        }
        />

      </div>

      {!workspaceAuthoringActive && (
        <EditorFloatingToolbar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        markerMode={markerMode}
        setMarkerMode={setMarkerMode}
        cutEnabled={cutEnabled}
        multipleSelectEnabled={multipleSelectEnabled}
        blinkSelectedObjectsEnabled={blinkSelectedObjectsEnabled}
        toggleBlinkSelectedObjects={toggleBlinkSelectedObjects}
        toggleMultipleSelect={toggleMultipleSelect}
        handleFile={handleFile}
        toggleCutSection={toggleCutSection}
        hideSelectedObject={hideSelectedObject}
        hideMultipleSelectedObjects={hideMultipleSelectedObjects}
        makeSelectedObjectsXray={makeSelectedObjectsXray}
        selectedObjectCount={selectedObjects.length}
        resetXray={resetXray}
        pullApart={pullApart}
        resetAllTransforms={resetAllTransforms}
        soloSelectedObject={soloSelectedObject}
        showAllObjects={showAllObjects}
        />
      )}

      {cutEnabled && !workspaceAuthoringActive && (
        <CutSectionSlider
          cutValues={cutValues}
          cutRanges={cutRanges}
          updateCutValue={updateCutValue}
          resetCutValues={resetCutValues}
          cutAllObjects={cutAllObjects}
          setCutAllObjects={setCutAllObjects}
          cutTargetAvailable={cutTargetAvailable}
          onClose={toggleCutSection}
        />
      )}

      <AnimationWorkspaceDock
        animationAuthoring={animationAuthoring}
        selectedObjectName={selectedObjectName}
      />
      <QuizWorkspaceDock
        quizAuthoring={quizAuthoring}
        selectedObjectName={selectedObjectName}
        procedures={material?.procedures || []}
        authoredAnimations={material?.authoredAnimations || []}
      />
      <XRWorkspaceDock
        xrAuthoring={xrAuthoring}
        onOpenPlayerPreview={controller.openPlayerPreview}
      />

      <EditorLeftSidebar
        activeSidebar={activeSidebar}
        setActiveSidebar={setActiveSidebar}
        objectList={objectList}
        selectedObject={selectedObject}
        selectedObjects={selectedObjects}
        multipleSelectEnabled={multipleSelectEnabled}
        selectObjectFromList={selectObjectFromList}
        clearSelection={clearSelection}
        setSelectedObject={setSelectedObject}
        highlightObject={highlightObject}
        makeXrayExcept={makeXrayExcept}
        resetXray={resetXray}
        focusObject={focusObject}
        markers={markers}
        setSelectedObjectName={setSelectedObjectName}
        treeDepth={treeDepth}
        setTreeDepth={setTreeDepth}
        maxTreeDepth={maxTreeDepth}
        searchObject={searchObject}
        setSearchObject={setSearchObject}
        showAllObjects={showAllObjects}
        hideAllObjects={hideAllObjects}
        setRightTab={setRightTab}
        renameObject={renameObject}
        material={material}
        setMaterial={setMaterial}
        saveDefaultPlayerCameraView={saveDefaultPlayerCameraView}
        selectedObjectName={selectedObjectName}
        applyShaderMode={applyShaderMode}
        shaderMode={shaderMode}
        metalness={metalness}
        setMetalness={setMetalness}
        roughness={roughness}
        setRoughness={setRoughness}
        viewerSettings={viewerSettings}
        setViewerSettings={setViewerSettings}
        updateEnvIntensity={updateEnvIntensity}
        activeChapterId={activeChapterId}
        setActiveChapterId={setActiveChapterId}
        previewChapterInEditor={previewChapterInEditor}
        createChapterFromSelectedObject={createChapterFromSelectedObject}
        contentAuthoringLocked={contentAuthoringLocked}
        contentAuthoringLockReason={contentAuthoringLockReason}
        saveCameraViewToActiveChapter={saveCameraViewToActiveChapter}
        panelSectionStyle={panelSectionStyle}
        inputStyle={inputStyle}
        mediaButtonStyle={mediaButtonStyle}
        updateChapterField={updateChapterField}
        addChapterParameter={addChapterParameter}
        updateChapterParameter={updateChapterParameter}
        deleteChapterParameter={deleteChapterParameter}
        deleteMarkerFromActiveChapter={deleteMarkerFromActiveChapter}
        animations={animations}
        isChapterAnimationSelected={isChapterAnimationSelected}
        getChapterAnimationConfig={getChapterAnimationConfig}
        toggleChapterAnimation={toggleChapterAnimation}
        updateChapterAnimationField={updateChapterAnimationField}
        playAnimationPreview={playAnimationPreview}
        stopAnimationPreview={stopAnimationPreview}
        addChapterMedia={addChapterMedia}
        deleteChapterMedia={deleteChapterMedia}
        moveChapter={moveChapter}
        requestAddMarker={requestAddMarker}
        cancelAddMarker={cancelAddMarker}
        markerMode={markerMode}
        selectedAnimations={selectedAnimations}
        setSelectedAnimations={setSelectedAnimations}
        setAnimationCommand={setAnimationCommand}
        flow={flow}
        procedural={procedural}
        animationAuthoring={animationAuthoring}
        quizAuthoring={quizAuthoring}
        xrAuthoring={xrAuthoring}
        slideAuthoring={slideAuthoring}
      />
    </div>
  );
}
