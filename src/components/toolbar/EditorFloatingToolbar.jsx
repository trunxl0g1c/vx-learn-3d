import Button from "../ui/button";

export default function EditorFloatingToolbar({
  activeMenu,
  setActiveMenu,
  cutEnabled,
  handleFile,
  toggleCutSection,
  hideSelectedObject,
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
        className="pointer-events-none absolute bottom-5 left-0 right-0 z-[120] flex justify-center"
      >
        <div className="pointer-events-auto flex gap-2 rounded-2xl bg-primary p-2">
          <Button
            onClick={() => document.getElementById("upload-model")?.click()}
            className="h-10! w-36 border-contrast-main! text-sm"
          >
            Upload Model
          </Button>

          <Button
            onClick={() => document.getElementById("open-vxpack")?.click()}
            className="h-10! w-36 border-contrast-main! text-sm"
          >
            Open Package
          </Button>

          <Button
            variant={cutEnabled ? "outline" : "default"}
            onClick={toggleCutSection}
            className="h-10! w-36 border-contrast-main! text-sm"
          >
            {cutEnabled ? "Cut ON" : "Cut OFF"}
          </Button>

          <Button
            onClick={() => toggleMenu("view")}
            className="h-10! w-36 border-contrast-main! text-sm"
          >
            View
          </Button>

          <Button
            onClick={hideSelectedObject}
            className="h-10! w-36 border-contrast-main! text-sm"
          >
            Hide Selected
          </Button>

          <Button
            onClick={resetXray}
            className="h-10! w-36 border-contrast-main! text-sm"
          >
            Reset X-Ray
          </Button>
        </div>
      </div>

      {activeMenu === "view" && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto absolute bottom-20 left-1/2 z-[120] flex -translate-x-1/4 transform flex-col gap-3 rounded-xl bg-primary p-3"
        >
          <Button size="sm" onClick={pullApart}>
            Pull Apart
          </Button>

          <Button size="sm" onClick={resetAllTransforms}>
            Reset All
          </Button>

          <Button size="sm" onClick={soloSelectedObject}>
            Solo
          </Button>

          <Button size="sm" onClick={showAllObjects}>
            Show All
          </Button>
        </div>
      )}
    </>
  );
}