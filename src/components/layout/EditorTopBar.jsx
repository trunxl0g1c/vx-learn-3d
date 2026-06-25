import { ChevronDown, CircleCheckBig, CircleUser, Share2 } from "lucide-react";
import Button from "../ui/button";

export default function EditorTopBar({ title }) {
  return (
    <div className="h-[64px] z-150 border-b border-divider-main bg-primary flex items-center justify-between px-10">
      <div className="flex justify-center items-center gap-13">
        <div className="text-[#3997FB] font-bold text-2xl">
          VX
          <span className="italic text-[#90C6FF]">E</span>
        </div>

        <div style={{ fontSize: 18, fontWeight: "bold" }}>
          {title || "VX Learn 3D"}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Button variant="cyanOutline" size="sm" className="uppercase">
          <CircleCheckBig className="size-4.5" />
          Publish
        </Button>

        <Button variant="cyanOutline" size="sm" className="uppercase">
          <Share2 className="size-4.5" />
          Share
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex border-none items-center"
        >
          <span className="text-base font-semibold">Jhon</span>
          <ChevronDown className="size-4.5" />
          <CircleUser className="size-6" />
        </Button>
      </div>
    </div>
  );
}
