import { Copy } from "lucide-react";
import Button from "../../ui/button";

export default function InfoTab({
  material,
  setActiveChapterId,
  setRightTab,
  deselectObject,
}) {
  const properties = [
    { label: "Part Type", value: material?.partType || "Baud 65" },
    { label: "Width", value: "320", unit: "cm" },
    { label: "Height", value: "480", unit: "cm" },
    { label: "Average of Lorem Ipsum", value: "6400", unit: "m²" },
    { label: "Long Value", value: "Lorem ipsum dolor sit amet..." },
  ];

  return (
    <div className="flex flex-col">
      <div className="border-b border-divider-main p-3">
        <div className="flex flex-col gap-2">
          {properties.map((item) => (
            <InfoPropertyRow key={item.label} {...item} />
          ))}
        </div>
      </div>

      <div className="flex gap-3 p-4">
        <Button
          variant="gold"
          className="flex-1"
          onClick={() => {
            deselectObject();
            setActiveChapterId(null);
          }}
        >
          DESELECT
        </Button>

        <Button
          onClick={() => {
            setRightTab("chapter");
          }}
          variant="outline"
          className="flex-1 border-accent-contrast!"
        >
          EDIT CONTENT
        </Button>
      </div>
    </div>
  );
}

function InfoPropertyRow({ label, value, unit }) {
  return (
    <div className="grid min-h-[30px] grid-cols-[155px_1fr_34px] overflow-hidden rounded-lg border border-divider-main bg-dark-alpha">
      <div className="flex items-center border-r border-divider-main px-3 text-sm font-normal text-secondary-default">
        {label}
      </div>

      <div className="flex items-center justify-between gap-2 px-3 text-sm text-white">
        <span className="line-clamp-2 leading-5">{value}</span>

        {unit && <span className="shrink-0 font-medium">{unit}</span>}
      </div>

      <button
        type="button"
        className="grid place-items-center text-secondary-default transition hover:bg-white/5 hover:text-white"
      >
        <Copy size={16} />
      </button>
    </div>
  );
}
