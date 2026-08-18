import { useState } from "react";
import {
  Eye,
  MousePointer2,
  RotateCcw,
  Scissors,
  Settings2,
} from "lucide-react";
import Button from "../ui/button";

function ToolbarIconButton({
  label,
  description,
  active = false,
  disabled = false,
  showTooltip = true,
  onClick,
  children,
}) {
  return (
    <div className="group relative">
      <Button
        variant={active ? "default" : "outline"}
        onClick={onClick}
        disabled={disabled}
        className="vx-editor-toolbar-button h-10! w-10! border-contrast-main! p-0!"
        aria-label={label}
        aria-pressed={active || undefined}
        title={description || label}
      >
        {children}
      </Button>

      {showTooltip && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-[140] mb-2 hidden w-max max-w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-[#101819F2] px-2.5 py-1.5 text-center text-[11px] leading-4 text-white shadow-xl backdrop-blur-md group-hover:block group-focus-within:block">
          <div className="font-semibold">{label}</div>
          {description && (
            <div className="mt-0.5 font-normal text-contrast-grayout">
              {description}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EditorFloatingToolbar({
  activeMenu,
  setActiveMenu,
  cutEnabled,
  multipleSelectEnabled,
  activeSelectionHasBlink,
  blinkPresets = [],
  assignBlinkPresetToSelectedObjects,
  removeBlinkFromSelectedObjects,
  toggleBlinkSelectedObjects,
  toggleMultipleSelect,
  handleFile,
  toggleCutSection,
  hideSelectedObject,
  hideMultipleSelectedObjects,
  makeSelectedObjectsXray,
  highlightSelectedObjectsAgainstXray,
  selectedObjectCount = 0,
  resetXray,
  pullApart,
  resetAllTransforms,
  soloSelectedObject,
  showAllObjects,
}) {
  const [blinkPresetMenuOpen, setBlinkPresetMenuOpen] = useState(false);

  const toggleMenu = (menuName) => {
    if (menuName !== "objectActions") {
      setBlinkPresetMenuOpen(false);
    }
    setActiveMenu((prev) => (prev === menuName ? null : menuName));
  };

  const toggleObjectActions = () => {
    if (activeMenu === "objectActions") {
      setBlinkPresetMenuOpen(false);
      setActiveMenu(null);
      return;
    }

    setActiveMenu("objectActions");
  };

  const actionSelectionLabel = multipleSelectEnabled
    ? selectedObjectCount > 0
      ? `${selectedObjectCount} object selected`
      : "Select one or more objects"
    : selectedObjectCount > 0
      ? "1 active object"
      : "Select an object first";

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
        className="vx-editor-toolbar-dock pointer-events-none fixed left-0 right-0 z-[120] flex justify-center"
      >
        <div className="vx-editor-toolbar-inner pointer-events-auto flex gap-2 rounded-2xl bg-[#182223B8] p-2">
          <ToolbarIconButton
            label={cutEnabled ? "Cut On" : "Cut Off"}
            description="Open or close the Cut Off controls."
            active={cutEnabled}
            onClick={toggleCutSection}
          >
            <Scissors size={18} strokeWidth={1.9} />
          </ToolbarIconButton>

          <div className="relative">
            {activeMenu === "objectActions" && (
              <div className="absolute bottom-full left-1/2 mb-3 flex w-64 -translate-x-1/2 flex-col gap-2 rounded-xl border border-contrast-main/40 bg-[#182223F2] p-3 shadow-xl backdrop-blur-md">
                <div className="px-1 text-[11px] font-medium text-contrast-grayout">
                  {actionSelectionLabel}
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
                  variant="outline"
                  disabled={selectedObjectCount === 0}
                  className="w-full border-contrast-main! text-xs"
                  onClick={highlightSelectedObjectsAgainstXray}
                >
                  Highlight Selected Objects
                </Button>

                <div className="relative">
                  <Button
                    size="sm"
                    variant={activeSelectionHasBlink ? "default" : "outline"}
                    disabled={selectedObjectCount === 0}
                    className="w-full border-contrast-main! text-xs"
                    onClick={() => setBlinkPresetMenuOpen((open) => !open)}
                    aria-expanded={blinkPresetMenuOpen}
                  >
                    Blink Selected Objects
                  </Button>

                  {blinkPresetMenuOpen && selectedObjectCount > 0 && (
                    <div className="mt-2 flex max-h-44 flex-col gap-1.5 overflow-y-auto rounded-lg border border-white/15 bg-[#101819] p-2">
                      {(blinkPresets.length > 0
                        ? blinkPresets
                        : [{ id: null, name: "Blink Preset 1" }]
                      ).map((preset, index) => (
                        <Button
                          key={preset.id || `legacy-blink-${index}`}
                          size="xs"
                          variant="outline"
                          className="w-full justify-start border-white/20 text-left text-[11px]"
                          onClick={() => {
                            if (
                              preset.id &&
                              assignBlinkPresetToSelectedObjects
                            ) {
                              assignBlinkPresetToSelectedObjects(preset.id);
                            } else {
                              toggleBlinkSelectedObjects?.();
                            }
                            setBlinkPresetMenuOpen(false);
                          }}
                        >
                          {`${index + 1}. ${preset.name || `Blink Preset ${index + 1}`}`}
                        </Button>
                      ))}

                      <Button
                        size="xs"
                        variant="destructive"
                        className="w-full text-[11px]"
                        onClick={() => {
                          removeBlinkFromSelectedObjects?.();
                          setBlinkPresetMenuOpen(false);
                        }}
                      >
                        Remove Blink
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <ToolbarIconButton
              label="Action to Object"
              description="Apply Hide, X-Ray, Highlight, or Blink to the active selection."
              active={activeMenu === "objectActions"}
              showTooltip={activeMenu !== "objectActions"}
              onClick={toggleObjectActions}
            >
              <Settings2 size={18} strokeWidth={1.9} />
            </ToolbarIconButton>
          </div>

          <ToolbarIconButton
            label="Multiple Select"
            description={
              multipleSelectEnabled
                ? "Multiple selection is active. Click to return to single selection."
                : "Allow more than one object to be selected at the same time."
            }
            active={multipleSelectEnabled}
            onClick={toggleMultipleSelect}
          >
            <MousePointer2 size={18} strokeWidth={1.9} />
          </ToolbarIconButton>

          <div className="relative">
            {activeMenu === "view" && (
              <div className="absolute bottom-full left-1/2 mb-3 flex w-44 -translate-x-1/2 flex-col gap-2 rounded-xl border border-contrast-main/40 bg-[#182223F2] p-3 shadow-xl backdrop-blur-md">
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

            <ToolbarIconButton
              label="View"
              description="Open view and transform controls."
              active={activeMenu === "view"}
              showTooltip={activeMenu !== "view"}
              onClick={() => toggleMenu("view")}
            >
              <Eye size={18} strokeWidth={1.9} />
            </ToolbarIconButton>
          </div>

          <ToolbarIconButton
            label="Reset X-Ray"
            description="Remove the current X-Ray assignment from the model."
            onClick={resetXray}
          >
            <RotateCcw size={18} strokeWidth={1.9} />
          </ToolbarIconButton>
        </div>
      </div>
    </>
  );
}
