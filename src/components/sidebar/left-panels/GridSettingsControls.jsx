import Switch from "../../ui/switch";
import Slider from "../../ui/slider";
import SelectField from "../../ui/select";
import ColorFieldInput from "./attributes/ColorFieldInput";
import { getViewerGrid, normalizeViewerGrid } from "../../../engine/viewer";

export default function GridSettingsControls({
  viewerSettings,
  setViewerSettings,
}) {
  const grid = getViewerGrid(viewerSettings);

  const updateGrid = (patch) => {
    setViewerSettings?.((previousSettings) => ({
      ...previousSettings,
      grid: normalizeViewerGrid({
        ...previousSettings?.grid,
        ...patch,
      }),
    }));
  };

  const cellSize = grid.divisions > 0 ? grid.size / grid.divisions : 0;

  return (
    <div className="border-t border-white/10 pt-4">
      <div className="flex items-center justify-between gap-4">
        <div className="max-w-60">
          <div className="text-sm font-normal text-white">Grid</div>
          <p className="mt-1 text-[11px] leading-5 text-contrast-grayout">
            Editor-style reference grid seperti Blender/CAD. Grid tidak mengubah
            model atau hierarchy GLB.
          </p>
        </div>

        <Switch
          checked={grid.enabled}
          onCheckedChange={(checked) => updateGrid({ enabled: checked })}
        />
      </div>

      {grid.enabled && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-normal text-secondary-default">
              Grid Plane
            </label>
            <SelectField
              value={grid.plane}
              onChange={(value) => updateGrid({ plane: value })}
              options={[
                { label: "Ground (XZ)", value: "xz" },
                { label: "Front (XY)", value: "xy" },
                { label: "Side (YZ)", value: "yz" },
              ]}
            />
          </div>

          <Slider
            label="Grid Size"
            value={grid.size}
            min={1}
            max={200}
            step={1}
            onChange={(value) => updateGrid({ size: value })}
          />

          <Slider
            label="Divisions"
            value={grid.divisions}
            min={2}
            max={100}
            step={1}
            onChange={(value) => updateGrid({ divisions: value })}
          />

          <div className="rounded-lg border border-white/10 bg-dark-alpha px-3 py-2 text-xs leading-5 text-contrast-grayout">
            <div>Cell Size: {Number(cellSize.toFixed(3))} scene units</div>
            <div>Grid otomatis ditempatkan di luar batas model agar tidak memotong object.</div>
            <div>Grid Offset menjadi penyesuaian tambahan dari posisi aman tersebut.</div>
          </div>

          <Slider
            label="Grid Offset"
            value={grid.offset}
            min={-50}
            max={50}
            step={0.1}
            onChange={(value) => updateGrid({ offset: value })}
          />

          <Slider
            label="Grid Opacity"
            value={grid.opacity}
            min={0.05}
            max={1}
            step={0.05}
            onChange={(value) => updateGrid({ opacity: value })}
          />

          <ColorFieldInput
            label="Center Axis Color"
            value={grid.centerColor}
            onChange={(value) => updateGrid({ centerColor: value })}
          />

          <ColorFieldInput
            label="Grid Line Color"
            value={grid.gridColor}
            onChange={(value) => updateGrid({ gridColor: value })}
          />

          <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4">
            <div>
              <div className="text-sm font-normal text-secondary-default">
                Show in Player
              </div>
              <p className="mt-1 text-xs leading-5 text-contrast-grayout">
                OFF menjadikan grid hanya sebagai helper di Editor.
              </p>
            </div>

            <Switch
              checked={grid.showInPlayer}
              onCheckedChange={(checked) =>
                updateGrid({ showInPlayer: checked })
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
