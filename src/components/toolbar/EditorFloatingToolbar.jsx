import Button from "../ui/button";

export default function EditorFloatingToolbar({
  activeMenu,
  setActiveMenu,
  cutEnabled,
  multipleSelectEnabled,
  blinkSelectedObjectsEnabled,
  toggleBlinkSelectedObjects,
  toggleMultipleSelect,
  handleFile,
  toggleCutSection,
  hideSelectedObject,
  hideMultipleSelectedObjects,
  makeSelectedObjectsXray,
  selectedObjectCount = 0,
  resetXray,
  pullApart,
  resetAllTransforms,
  soloSelectedObject,
  showAllObjects,
}) {
  const toggleMenu = (menuName) => {
    setActiveMenu((prev) => (prev === menuName ? null : menuName));
  };

  return (
    <>
      <input
        id="upload-model"
        type="file"
        accept=".glb,.gltf"
        onChange={handleFile}
        hidden
      />

      <input
        id="open-vxpack"
        type="file"
        accept=".vxpack"
        onChange={handleFile}
        hidden
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="vx-editor-toolbar-dock pointer-events-none absolute bottom-5 left-0 right-0 z-[120] flex justify-center"
      >
        <div className="vx-editor-toolbar-inner pointer-events-auto flex gap-2 rounded-2xl bg-[#182223B8] p-2">
          {/* <Button
            onClick={() => document.getElementById("upload-model")?.click()}
            className="vx-editor-toolbar-button h-10! w-36 border-contrast-main! text-sm"
          >
            Upload Model
          </Button> */}

          {/* <Button
            onClick={() => document.getElementById("open-vxpack")?.click()}
            className="vx-editor-toolbar-button h-10! w-36 border-contrast-main! text-sm"
          >
            Open Package
          </Button> */}

          <Button
            variant={cutEnabled ? "default" : "outline"}
            onClick={toggleCutSection}
            className="vx-editor-toolbar-button h-10! w-36 border-contrast-main! text-sm"
          >
            {cutEnabled ? "Cut On" : "Cut Off"}
          </Button>

          <div className="relative">
            {multipleSelectEnabled && (
              <div className="absolute bottom-full left-1/2 mb-3 flex w-52 -translate-x-1/2 flex-col gap-2 rounded-xl border border-contrast-main/40 bg-[#182223F2] p-3 shadow-xl backdrop-blur-md">
                <div className="px-1 text-[11px] font-medium text-contrast-grayout">
                  {selectedObjectCount > 0
                    ? `${selectedObjectCount} object selected`
                    : "Select objects in the viewport"}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedObjectCount === 0}
                  className="w-full border-contrast-main! text-xs"
                  onClick={hideMultipleSelectedObjects}
                >
                  Hide Selected Objects
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={selectedObjectCount === 0}
                  className="w-full border-contrast-main! text-xs"
                  onClick={makeSelectedObjectsXray}
                >
                  X-Ray Selected Objects
                </Button>

                <Button
                  size="sm"
                  variant={blinkSelectedObjectsEnabled ? "default" : "outline"}
                  disabled={selectedObjectCount === 0}
                  className="w-full border-contrast-main! text-xs"
                  onClick={toggleBlinkSelectedObjects}
                  aria-pressed={blinkSelectedObjectsEnabled}
                >
                  Blink Selected Objects
                </Button>
              </div>
            )}

            <Button
              variant={multipleSelectEnabled ? "default" : "outline"}
              onClick={toggleMultipleSelect}
              className="vx-editor-toolbar-button h-10! w-40 border-contrast-main! text-sm"
              aria-pressed={multipleSelectEnabled}
            >
              Multiple Select
            </Button>
          </div>

          <Button
            variant={activeMenu === "view" ? "default" : "outline"}
            onClick={() => toggleMenu("view")}
            className="vx-editor-toolbar-button h-10! w-36 border-contrast-main! text-sm"
          >
            View
          </Button>

          {/* <Button
            onClick={hideSelectedObject}
            className="vx-editor-toolbar-button h-10! w-36 border-contrast-main! text-sm"
          >
            Hide Selected
          </Button> */}

          <Button
            variant="outline"
            onClick={resetXray}
            className="vx-editor-toolbar-button h-10! w-36 border-contrast-main! text-sm"
          >
            Reset X-Ray
          </Button>
        </div>
      </div>

      {activeMenu === "view" && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="vx-editor-view-menu pointer-events-auto absolute bottom-20 left-[48.5%] z-[120] flex -translate-x-1/4 transform flex-col gap-3 rounded-xl bg-[#182223B8] p-3"
        >
          <Button
            size="sm"
            variant="outline"
            className="border-contrast-main! text-sm"
            onClick={pullApart}
          >
            Pull Apart
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="border-contrast-main! text-sm"
            onClick={resetAllTransforms}
          >
            Reset All
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="border-contrast-main! text-sm"
            onClick={soloSelectedObject}
          >
            Solo
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="border-contrast-main! text-sm"
            onClick={showAllObjects}
          >
            Show All
          </Button>
        </div>
      )}
    </>
  );
}
