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
    modelUrl,
    addMarker,
    handleModelLoaded,
    markerMode,
    setMarkerMode,
    selectObjectFromMesh,
    selectedAnimations,
    setSelectedAnimations,
    animationCommand,
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
    cutAxis,
    updateCutAxis,
    cutValue,
    cutMin,
    cutMax,
    setCutValue,
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
    handleMarkerPointPicked,
    setRightTab,
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
        modelUrl={modelUrl}
        // addMarker={addMarker}
        addMarker={handleMarkerPointPicked}
        handleModelLoaded={handleModelLoaded}
        markerMode={markerMode}
        selectObjectFromMesh={selectObjectFromMesh}
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
          cutAxis={cutAxis}
          setCutAxis={updateCutAxis}
          cutValue={cutValue}
          cutMin={cutMin}
          cutMax={cutMax}
          setCutValue={setCutValue}
        />
      )}

      <EditorLeftSidebar
        activeSidebar={activeSidebar}
        setActiveSidebar={setActiveSidebar}
        objectList={objectList}
        selectedObject={selectedObject}
        highlightObject={highlightObject}
        makeXrayExcept={makeXrayExcept}
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
        material={material}
        setMaterial={setMaterial}
        applyShaderMode={applyShaderMode}
        shaderMode={shaderMode}
        metalness={metalness}
        setMetalness={setMetalness}
        roughness={roughness}
        setRoughness={setRoughness}
        viewerSettings={viewerSettings}
        setViewerSettings={setViewerSettings}
        updateEnvIntensity={updateEnvIntensity}
        setSelectedObject={setSelectedObject}
        setRightTab={setRightTab}
      />
    </div>
  );
}
