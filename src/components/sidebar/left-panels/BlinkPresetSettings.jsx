import { Plus, Trash2 } from "lucide-react";
import Button from "../../ui/button";
import Input from "../../ui/input";
import Slider from "../../ui/slider";
import ColorFieldInput from "./attributes/ColorFieldInput";
import { createId } from "../../../utils/createId";
import {
  DEFAULT_BLINK_SELECTION_SETTINGS,
  normalizeBlinkPresets,
  normalizeBlinkSelectionSettings,
} from "../../../engine/selection";

export default function BlinkPresetSettings({ viewerSettings, setViewerSettings, embedded = false }) {
  const presets = normalizeBlinkPresets(
    viewerSettings?.blinkPresets,
    viewerSettings?.blinkSettings,
  );

  const commitPresets = (nextPresets) => {
    const normalized = normalizeBlinkPresets(nextPresets);
    const firstPreset = normalized[0] || {
      ...DEFAULT_BLINK_SELECTION_SETTINGS,
    };

    setViewerSettings?.((previous) => ({
      ...previous,
      blinkPresets: normalized,
      // Keep the legacy field synchronized for old projects / old saved views.
      blinkSettings: normalizeBlinkSelectionSettings(firstPreset),
    }));
  };

  const updatePreset = (presetId, patch) => {
    commitPresets(
      presets.map((preset) =>
        preset.id === presetId ? { ...preset, ...patch } : preset,
      ),
    );
  };

  const addPreset = () => {
    const nextNumber = presets.length + 1;
    commitPresets([
      ...presets,
      {
        id: createId("blink-preset"),
        name: `Blink Preset ${nextNumber}`,
        ...DEFAULT_BLINK_SELECTION_SETTINGS,
      },
    ]);
  };

  const removePreset = (presetId) => {
    if (presets.length <= 1) return;
    commitPresets(presets.filter((preset) => preset.id !== presetId));
  };

  return (
    <div className={embedded ? "" : "rounded-xl border border-secondary-default bg-primary p-4"}>
      {!embedded && (
        <div className="mb-2 text-sm font-normal text-white">Blink Setting</div>
      )}

      <p className="mb-4 text-xs leading-5 text-contrast-grayout">
        Buat beberapa preset Blink. Saat Blink di-assign ke object, pilih preset
        yang ingin digunakan. Preset ikut tersimpan bersama Project Settings.
      </p>

      <div className="space-y-4">
        {presets.map((preset, index) => (
          <div
            key={preset.id}
            className="rounded-xl border border-white/10 bg-black/10 p-3"
          >
            <div className="mb-4 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="mb-1 text-[11px] text-contrast-grayout">
                  Preset {index + 1}
                </div>
                <Input
                  value={preset.name}
                  onChange={(event) =>
                    updatePreset(preset.id, { name: event.target.value })
                  }
                  className="h-9 rounded-lg px-3"
                  inputClassName="text-sm"
                  aria-label={`Blink preset ${index + 1} name`}
                />
              </div>

              <Button
                type="button"
                size="xs"
                variant="destructive"
                disabled={presets.length <= 1}
                className="mt-5 size-9 px-0"
                onClick={() => removePreset(preset.id)}
                title={
                  presets.length <= 1
                    ? "Minimal satu Blink preset"
                    : "Delete Blink preset"
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <Slider
                label="Blink Thickness"
                value={preset.thickness}
                min={1}
                max={20}
                step={0.5}
                onChange={(value) =>
                  updatePreset(preset.id, { thickness: Number(value) })
                }
              />

              <ColorFieldInput
                label="Blink Color"
                value={preset.color}
                onChange={(value) => updatePreset(preset.id, { color: value })}
              />

              <Slider
                label="Blink Speed"
                value={preset.speed}
                min={0.1}
                max={5}
                step={0.1}
                onChange={(value) =>
                  updatePreset(preset.id, { speed: Number(value) })
                }
              />
            </div>
          </div>
        ))}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="w-full border-secondary-default! text-secondary-default"
          onClick={addPreset}
        >
          <Plus className="size-4" />
          Add Preset Blink
        </Button>
      </div>
    </div>
  );
}
