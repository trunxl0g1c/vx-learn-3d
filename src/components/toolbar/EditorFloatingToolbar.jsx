import {
  menuButtonStyle,
  menuStyle,
  toolButtonStyle,
  toolbarDockStyle,
  toolbarInnerStyle,
} from "../../constants/viewerStyles";
import Button from "../ui/button";

export default function EditorFloatingToolbar({
  activeMenu,
  setActiveMenu,
  markerMode,
  setMarkerMode,
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
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute left-0 right-0 bottom-5 z-120 flex justify-center pointer-none"
      >
        <div className="flex gap-2 rounded-2xl bg-primary p-2">
          <Button className="text-sm border-contrast-main! w-36 h-10!">
            <label>
              Load Model
              <input
                type="file"
                accept=".glb,.gltf"
                onChange={handleFile}
                style={{ display: "none" }}
              />
            </label>
          </Button>

          <Button
            onClick={() => setMarkerMode(!markerMode)}
            className="text-sm border-contrast-main! w-36 h-10!"
          >
            {markerMode ? "Marker ON" : "Marker OFF"}
          </Button>

          <Button
            variant={cutEnabled ? "outline" : "default"}
            onClick={toggleCutSection}
            className="text-sm border-contrast-main! w-36 h-10!"
          >
            {cutEnabled ? "Cut ON" : "Cut OFF"}
          </Button>

          <Button
            onClick={() => toggleMenu("view")}
            className="text-sm border-contrast-main! w-36 h-10!"
          >
            View
          </Button>

          <Button
            onClick={hideSelectedObject}
            className="text-sm border-contrast-main! w-36 h-10!"
          >
            Hide Selected
          </Button>

          <Button
            onClick={resetXray}
            className="text-sm border-contrast-main! w-36 h-10!"
          >
            Reset X-Ray
          </Button>
        </div>
      </div>

      {activeMenu === "view" && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-1/2 bottom-20 transform -translate-x-1/4 flex flex-col gap-3 p-3 rounded-xl bg-primary z-120"
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
