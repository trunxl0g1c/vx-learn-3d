import { useState } from "react";
import SceneCanvas from "../canvas/SceneCanvas";
import EditorFloatingToolbar from "../toolbar/EditorFloatingToolbar";
import CutSectionSlider from "../toolbar/CutSectionSlider";
import EditorLeftSidebar from "../sidebar/EditorLeftSidebar";
import AnimationWorkspaceDock from "../animation/AnimationWorkspaceDock";
import QuizWorkspaceDock from "../quiz/QuizWorkspaceDock";
import XRWorkspaceDock from "../xr/XRWorkspaceDock";
import SelectedObjectBadge from "./SelectedObjectBadge";
import EditorSceneViewGizmo from "../viewer/EditorSceneViewGizmo";
import TransformModeToolbar from "../viewer/TransformModeToolbar";
import { viewportStyle } from "../../constants/viewerStyles";

const DEFAULT_ANIMATION_DOCK_HEIGHT = 360;

export default function EditorViewport({ controller }) {
  const [procedureStepPanelVisible, setProcedureStepPanelVisible] = useState(false);
  const [animationDockHeight, setAnimationDockHeight] = useState(
    DEFAULT_ANIMATION_DOCK_HEIGHT,
  );

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
    additionalModels,
    modelLicenseModels,
    handleUpdateModelLicense,
    handleReadModelLicenseMetadata,
    handleAddAdditionalGlbFiles,
    handleRemoveAdditionalGlb,
    handleRemoveProjectMedia,
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
    activeSelectionHasBlink,
    blinkRenderGroups,
    blinkOutlineObjects,
    assignBlinkPresetToSelectedObjects,
    removeBlinkFromSelectedObjects,
    toggleBlinkSelectedObjects,
    toggleMultipleSelect,
    clearSelection,
    clearSelectionFromViewport,
    selectObjectFromList,
    isTransforming,
    setIsTransforming,
    objectTransformMode,
    setObjectTransformMode,
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
    highlightSelectedObjectsAgainstXray,
    resetXray,
    pullApart,
    resetAllObjectState,
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
    saveDefaultPlayerCameraViewAndState,
    flow,
    procedural,
    animationAuthoring,
    animationPlayback,
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
  } = controller;

  let viewportBottomOffset = 0;
  if (animationAuthoring?.isAuthoringActive) {
    viewportBottomOffset = animationDockHeight;
  } else if (quizAuthoring?.isAuthoringActive) {
    viewportBottomOffset = 420;
  } else if (xrAuthoring?.isAuthoringActive) {
    viewportBottomOffset = 360;
  }

  const workspaceAuthoringActive = Boolean(
    animationAuthoring?.isAuthoringActive ||
      quizAuthoring?.isAuthoringActive ||
      xrAuthoring?.isAuthoringActive,
  );
  const floatingToolbarVisible = Boolean(
    !quizAuthoring?.isAuthoringActive && !xrAuthoring?.isAuthoringActive,
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

  const proceduralGizmoActive = Boolean(
    procedural?.isAuthoringActive && procedural?.activeAnimatedObject,
  );
  const animationGizmoActive = Boolean(
    animationAuthoring?.isAuthoringActive &&
      animationAuthoring?.activeTrackObject &&
      animationAuthoring?.activeTrack?.rig?.type !== "hydraulic" &&
      animationAuthoring?.isPivotEditing !== true,
  );
  const regularGizmoActive = Boolean(
    selectedObject && !flow?.isAuthoringActive && !animationAuthoring?.isPivotEditing,
  );
  const transformToolbarVisible =
    proceduralGizmoActive || animationGizmoActive || regularGizmoActive;
  const activeGizmoMode = proceduralGizmoActive
    ? procedural?.transformMode || "translate"
    : animationGizmoActive
      ? animationAuthoring?.transformMode || "translate"
      : objectTransformMode || "translate";
  const setActiveGizmoMode = (mode) => {
    if (proceduralGizmoActive) {
      procedural?.setTransformMode?.(mode);
      return;
    }

    if (animationGizmoActive) {
      animationAuthoring?.setTransformMode?.(mode);
      return;
    }

    setObjectTransformMode?.(mode);
  };
  const handleViewportObjectSelect = (object) => {
    selectObjectFromMesh?.(object);
    if (animationAuthoring?.isAuthoringActive) setActiveSidebar("hierarchy");
  };
  const handleTransformStart = (object) => {
    animationAuthoring?.beginActiveTrackTransform?.(object);
    beginObjectTransformHistory?.(object);
  };
  const handleTransformEnd = (object) => {
    commitObjectTransformHistory?.(object);
    animationAuthoring?.endActiveTrackTransform?.(object);
  };

  return (
    <div onClick={() => setActiveMenu(null)} style={viewportStyle}>
      <EditorSceneViewGizmo
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        onChangeView={setEditorCameraView}
        projectionMode={activeCameraProjectionMode}
        onChangeProjectionMode={setEditorCameraProjectionMode}
        rightPanelVisible={rightPanelVisible || procedureStepPanelVisible}
        rightPanelWidth={procedureStepPanelVisible && !rightPanelVisible ? 400 : null}
      />

      <SelectedObjectBadge
        selectedObjectName={selectedObjectName}
        transformToolbarVisible={transformToolbarVisible}
      />

      {transformToolbarVisible && (
        <div className="vx-editor-transform-toolbar-dock pointer-events-none absolute left-1/2 top-16 z-[100] max-w-[calc(100vw-24px)] -translate-x-1/2">
          <TransformModeToolbar mode={activeGizmoMode} onChange={setActiveGizmoMode} />
        </div>
      )}

      <div
        className="absolute inset-x-0 top-0"
        style={{ bottom: viewportBottomOffset }}
      >
        <SceneCanvas
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        focusTargetRef={focusTargetRef}
        viewerSettings={viewerSettings}
        cameraProjectionMode={activeCameraProjectionMode}
        outlineObjects={outlineObjects}
        blinkSelectionEnabled={blinkSelectedObjectsEnabled}
        blinkRenderGroups={blinkRenderGroups}
        blinkOutlineObjects={blinkOutlineObjects}
        shaderOutlineObjects={shaderOutlineObjects}
        shaderOutlineStyle={shaderOutlineStyle}
        modelUrl={modelUrl}
        additionalModels={additionalModels}
        additionalModelsEnabled={material?.proToolsSettings?.addMoreGlb === true}
        // addMarker={addMarker}
        addMarker={handleMarkerPointPicked}
        handleModelLoaded={handleModelLoaded}
        markerMode={markerMode}
        selectObjectFromMesh={handleViewportObjectSelect}
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
        objectTransformMode={objectTransformMode}
        isTransforming={isTransforming}
        setIsTransforming={setIsTransforming}
        orbitEnabled={orbitEnabled}
        setOrbitEnabled={setOrbitEnabled}
        setSelectedObject={setSelectedObject}
        setOutlineObjects={setOutlineObjects}
        setSelectedObjectName={setSelectedObjectName}
        onTransformStart={handleTransformStart}
        onTransformEnd={handleTransformEnd}
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
        animationPivotObject={
          animationAuthoring?.isAuthoringActive
            ? animationAuthoring?.activeRigPointObject || null
            : null
        }
        animationPivotValue={
          animationAuthoring?.isAuthoringActive
            ? animationAuthoring?.activeRigPointValue || [0, 0, 0]
            : [0, 0, 0]
        }
        onAnimationTransformChange={
          animationAuthoring?.isAuthoringActive
            ? animationAuthoring?.previewActiveTrackTransform
            : null
        }
        onAnimationPivotTransform={
          animationAuthoring?.isAuthoringActive
            ? animationAuthoring?.applyActiveTrackPivotTransform
            : null
        }
        onAnimationPivotChange={
          animationAuthoring?.isAuthoringActive
            ? animationAuthoring?.setActiveTrackRigPoint
            : null
        }
        onAnimationPivotPick={
          animationAuthoring?.isAuthoringActive
            ? animationAuthoring?.snapActiveTrackRigPivotFromHit
            : null
        }
        />

      </div>

      {floatingToolbarVisible && (
        <EditorFloatingToolbar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        markerMode={markerMode}
        setMarkerMode={setMarkerMode}
        cutEnabled={cutEnabled}
        multipleSelectEnabled={multipleSelectEnabled}
        activeSelectionHasBlink={activeSelectionHasBlink}
        blinkPresets={viewerSettings?.blinkPresets}
        assignBlinkPresetToSelectedObjects={assignBlinkPresetToSelectedObjects}
        removeBlinkFromSelectedObjects={removeBlinkFromSelectedObjects}
        toggleBlinkSelectedObjects={toggleBlinkSelectedObjects}
        toggleMultipleSelect={toggleMultipleSelect}
        handleFile={handleFile}
        toggleCutSection={toggleCutSection}
        hideSelectedObject={hideSelectedObject}
        hideMultipleSelectedObjects={hideMultipleSelectedObjects}
        makeSelectedObjectsXray={makeSelectedObjectsXray}
        highlightSelectedObjectsAgainstXray={highlightSelectedObjectsAgainstXray}
        selectedObjectCount={
          multipleSelectEnabled
            ? selectedObjects.length
            : selectedObject
              ? 1
              : 0
        }
        resetXray={resetXray}
        pullApart={pullApart}
        resetAllObjectState={resetAllObjectState}
        soloSelectedObject={soloSelectedObject}
        showAllObjects={showAllObjects}
        animationWorkspaceOpen={animationAuthoring?.isAuthoringActive === true}
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
        dockHeight={animationDockHeight}
        onDockHeightChange={setAnimationDockHeight}
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
        modelScene={modelScene}
        setMaterial={setMaterial}
        saveDefaultPlayerCameraViewAndState={saveDefaultPlayerCameraViewAndState}
        cameraProjectionMode={activeCameraProjectionMode}
        setCameraProjectionMode={setEditorCameraProjectionMode}
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
        animations={animations}
        selectedAnimations={selectedAnimations}
        setSelectedAnimations={setSelectedAnimations}
        setAnimationCommand={setAnimationCommand}
        flow={flow}
        procedural={procedural}
        animationAuthoring={animationAuthoring}
        animationPlayback={animationPlayback}
        quizAuthoring={quizAuthoring}
        xrAuthoring={xrAuthoring}
        slideAuthoring={slideAuthoring}
        additionalModels={additionalModels}
        modelLicenseModels={modelLicenseModels}
        onUpdateModelLicense={handleUpdateModelLicense}
        onReadModelLicenseMetadata={handleReadModelLicenseMetadata}
        onAddAdditionalGlbFiles={handleAddAdditionalGlbFiles}
        onRemoveAdditionalGlb={handleRemoveAdditionalGlb}
        onRemoveProjectMedia={handleRemoveProjectMedia}
        onProcedureStepPanelVisibilityChange={setProcedureStepPanelVisible}
      />
    </div>
  );
}
