import {
  ChevronDown,
  CircleCheckBig,
  CircleUser,
  Share2,
  Loader2,
  CloudOff,
  Download,
  PlayCircle,
} from "lucide-react";
import Button from "../ui/button";
import { getCurrentUserName } from "../../utils/authUser";
import MaterialIcon from "../ui/material-icon";

function SaveStatusBadge({ status }) {
  if (status === "saving") {
    return (
      <div className="flex items-center gap-2 text-xs text-yellow-300">
        <Loader2 className="size-4 animate-spin" />
        Saving...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 text-xs text-red-400">
        <CloudOff className="size-4" />
        Save failed
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-emerald-400">
      <CircleCheckBig className="size-4" />
      Saved locally
    </div>
  );
}

export default function EditorTopBar({ title, saveStatus = "saved", onPlay }) {
  const currentUserName = getCurrentUserName();

  return (
    <div className="h-[56px] z-150 border-b border-divider-main bg-primary flex items-center justify-between px-5">
      <div className="flex justify-center items-center gap-7">
        {/* <div className="text-[#3997FB] font-bold text-2xl">
          VX
          <span className="italic text-[#90C6FF]">E</span>
        </div> */}
        <img
          src="/images/logo.svg"
          alt="VXplore Studio"
          className="size-8"
        />

        <span className="font-normal text-xl">{title || "VX Learn 3D"}</span>

        <SaveStatusBadge status={saveStatus} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Button
          variant="ghost"
          size="xs"
          className="border-none px-1!"
          onClick={onPlay}
          title="Preview in Player"
        >
          <MaterialIcon
            name="play_circle"
            fill={1}
            size={26}
            className="text-secondary-default"
          />
          {/* <PlayCircle className="size-6.5" color="#66B0C0" /> */}
        </Button>
        <Button variant="cyanOutline" size="sm" className="uppercase">
          {/* <CircleCheckBig className="size-4.5 mr-1" /> */}
          <MaterialIcon
            name="published_with_changes"
            fill={1}
            size={20}
            className="mr-1"
          />
          Publish
        </Button>

        <Button disabled variant="cyanOutline" size="sm" className="uppercase">
          {/* <Download className="size-4.5 mr-1" /> */}
          <MaterialIcon name="download_2" fill={1} size={20} className="mr-1" />
          Export
        </Button>

        <Button disabled variant="cyanOutline" size="sm" className="uppercase">
          {/* <Share2 className="size-4.5 mr-1" /> */}
          <MaterialIcon name="share" fill={1} size={20} className="mr-1" />
          Share
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex border-none items-center"
        >
          <span className="text-base">{currentUserName || "Guest"}</span>
          {/* <ChevronDown className="size-4.5" /> */}
          <MaterialIcon
            name="arrow_back_2"
            fill={1}
            size={20}
            className="-rotate-90"
          />
          <MaterialIcon
            name="account_circle"
            fill
            size={30}
            className="text-accent-main"
          />
          {/* <CircleUser className="size-7" color="#03699D" /> */}
        </Button>
      </div>
    </div>
  );
}
