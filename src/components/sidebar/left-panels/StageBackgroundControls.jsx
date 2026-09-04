import Slider from "../../ui/slider";
import ColorFieldInput from "./attributes/ColorFieldInput";

export default function StageBackgroundControls({
  background,
  updateBackground,
}) {
  return (
    <>
      <ColorFieldInput
        label="Backdrop Color"
        value={background.stageBackdropColor}
        onChange={(value) => updateBackground({ stageBackdropColor: value })}
      />

      <ColorFieldInput
        label="Floor Color"
        value={background.stageFloorColor}
        onChange={(value) => updateBackground({ stageFloorColor: value })}
      />

      <Slider
        label="Shadow Opacity"
        value={background.stageShadowOpacity}
        min={0}
        max={1}
        step={0.05}
        onChange={(value) => updateBackground({ stageShadowOpacity: value })}
      />

      <Slider
        label="Shadow Softness"
        value={background.stageShadowSoftness}
        min={0}
        max={1}
        step={0.05}
        onChange={(value) => updateBackground({ stageShadowSoftness: value })}
      />

      <Slider
        label="Shadow Blur Radius"
        value={background.stageShadowBlurRadius}
        min={0}
        max={12}
        step={0.5}
        onChange={(value) => updateBackground({ stageShadowBlurRadius: value })}
      />

      <Slider
        label="Shadow Distance / Spread"
        value={background.stageShadowSpread}
        min={0.5}
        max={2.5}
        step={0.1}
        onChange={(value) => updateBackground({ stageShadowSpread: value })}
      />

      <Slider
        label="Floor Glossiness"
        value={background.stageFloorGlossiness}
        min={0}
        max={1}
        step={0.05}
        onChange={(value) => updateBackground({ stageFloorGlossiness: value })}
      />
    </>
  );
}
