import SceneCanvas from "../canvas/SceneCanvas";
import EditorFloatingToolbar from "../toolbar/EditorFloatingToolbar";
import CutSectionSlider from "../toolbar/CutSectionSlider";
import EditorLeftSidebar from "../sidebar/EditorLeftSidebar";
import SelectedObjectBadge from "./SelectedObjectBadge";
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
    modelScene,
    targetRotationY,
    isAutoRotating,
    setIsAutoRotating,

    selectedObject,
    isTransforming,
    setIsTransforming,
    orbitEnabled,
    setOrbitEnabled,
    setSelectedObject,
    setOutlineObjects,
    setSelectedObjectName,

    cutEnabled,
    cutValues,
    cutRanges,
    updateCutValue,
    resetCutValues,

    handleFile,
    toggleCutSection,
    hideSelectedObject,
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

    activeChapterId,
    setActiveChapterId,
    previewChapterInEditor,
    createChapterFromSelectedObject,
    saveVisualStateToActiveChapter,
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
    requestAddMarker,
    cancelAddMarker,
  } = controller;
  
  return (
    <div onClick={() => setActiveMenu(null)} style={viewportStyle}>
      <SelectedObjectBadge selectedObjectName={selectedObjectName} />

      <SceneCanvas
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        focusTargetRef={focusTargetRef}
        viewerSettings={viewerSettings}
        outlineObjects={outlineObjects}
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
      />

      <EditorFloatingToolbar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        markerMode={markerMode}
        setMarkerMode={setMarkerMode}
        cutEnabled={cutEnabled}
        handleFile={handleFile}
        toggleCutSection={toggleCutSection}
        hideSelectedObject={hideSelectedObject}
        resetXray={resetXray}
        pullApart={pullApart}
        resetAllTransforms={resetAllTransforms}
        soloSelectedObject={soloSelectedObject}
        showAllObjects={showAllObjects}
      />

      {cutEnabled && (
        <CutSectionSlider
          cutValues={cutValues}
          cutRanges={cutRanges}
          updateCutValue={updateCutValue}
          resetCutValues={resetCutValues}
          onClose={toggleCutSection}
        />
      )}

      <EditorLeftSidebar
        activeSidebar={activeSidebar}
        setActiveSidebar={setActiveSidebar}
        objectList={objectList}
        selectedObject={selectedObject}
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
        requestAddMarker={requestAddMarker}
        cancelAddMarker={cancelAddMarker}
        markerMode={markerMode}
        selectedAnimations={selectedAnimations}
        setSelectedAnimations={setSelectedAnimations}
        setAnimationCommand={setAnimationCommand}
      />
    </div>
  );
}
