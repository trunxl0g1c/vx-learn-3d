import { RotateCw } from "lucide-react";
import { normalizeTurntableAnimationSettings } from "../../../modules/material/playerSettings";
import Slider from "../../ui/slider";
import Switch from "../../ui/switch";

export default function TurntableAnimationSettings({ settings, onChange, embedded = false }) {
  const turntable = normalizeTurntableAnimationSettings(settings);

  const updateSettings = (patch) => {
    onChange?.(
      normalizeTurntableAnimationSettings({
        ...turntable,
        ...patch,
      }),
    );
  };

  return (
    <div className={embedded ? "" : "rounded-xl border border-secondary-default bg-primary p-4"}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          {!embedded && (
            <RotateCw className="size-4 shrink-0 text-secondary-default" />
          )}

          <div>
            {!embedded && (
              <div className="text-sm font-normal text-white">
                Turntable Animation
              </div>
            )}
            <p className={embedded ? "text-xs leading-5 text-contrast-grayout" : "mt-1 text-xs leading-5 text-contrast-grayout"}>
              Memutar model hanya pada tampilan awal Player. Animasi berhenti
              saat Chapter, Flow, Procedure, Free Play, atau panel lain dibuka.
            </p>
          </div>
        </div>

        <Switch
          checked={turntable.enabled}
          onCheckedChange={(checked) => updateSettings({ enabled: checked })}
          className="shrink-0"
        />
      </div>

      <div
        className={[
          "mt-4 space-y-4 border-t border-white/10 pt-4 transition-opacity",
          turntable.enabled
            ? "opacity-100"
            : "pointer-events-none opacity-45",
        ].join(" ")}
      >
        <Slider
          label="Rotation Speed (RPM)"
          value={turntable.speed}
          min={0.5}
          max={12}
          step={0.5}
          onChange={(value) => updateSettings({ speed: Number(value) })}
        />

        <div>
          <div className="mb-2 text-sm font-normal text-secondary-default">
            Rotation Direction
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "clockwise", label: "Clockwise" },
              { value: "counterclockwise", label: "Counterclockwise" },
            ].map((option) => {
              const selected = turntable.direction === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateSettings({ direction: option.value })}
                  className={[
                    "h-10 rounded-lg border px-3 text-xs font-medium transition",
                    selected
                      ? "border-accent-main bg-accent-main/10 text-accent-main"
                      : "border-[#315b64] bg-transparent text-contrast-grayout hover:border-secondary-default hover:text-white",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
