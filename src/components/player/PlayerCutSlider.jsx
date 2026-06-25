import Slider from "../ui/slider";

export default function PlayerCutSlider({ cutX, cutMin, cutMax, setCutX }) {
  return (
    <div className="absolute left-1/2 bottom-[120px] z-[120] w-[360px] -translate-x-1/2 rounded-2xl border border-divider-main bg-primary/75 p-4 text-white shadow-[0_18px_50px_rgba(0,0,0,0.38)] backdrop-blur-xl backdrop-saturate-150">
      <Slider
        label="Cut X"
        value={Number(cutX.toFixed(2))}
        min={cutMin}
        max={cutMax}
        step={0.01}
        onChange={setCutX}
      />
    </div>
  );
}
