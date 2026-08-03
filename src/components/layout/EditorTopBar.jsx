import {
  CircleCheckBig,
  Loader2,
  CloudOff,
} from "lucide-react";
import Button from "../ui/button";
import MaterialIcon from "../ui/material-icon";
import UserMenu from "../../modules/auth/components/UserMenu";
import { EDITOR_TOP_BAR_HEIGHT } from "../../constants/editorLayout";

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

export default function EditorTopBar({
  title,
  saveStatus = "saved",
  onPlay,
  onExport,
  isExporting = false,
  exportProgress = 0,
  exportStatus = "",
}) {
  return (
    <div
      style={{ height: EDITOR_TOP_BAR_HEIGHT }}
      className="vx-editor-topbar z-150 shrink-0 border-b border-divider-main bg-primary flex items-center justify-between px-5"
    >
      <div className="vx-editor-topbar__left flex items-center gap-7">
        {/* <div className="text-[#3997FB] font-bold text-2xl">
          VX
          <span className="italic text-[#90C6FF]">E</span>
        </div> */}
        <img
          src="/images/logo.svg"
          alt="Viqubed Studio"
          className="vx-editor-topbar__logo size-8"
        />

        <span className="vx-editor-topbar__title max-w-[34vw] truncate font-normal text-xl">{title || "VX Learn 3D"}</span>

        <div className="vx-editor-topbar__save"><SaveStatusBadge status={saveStatus} /></div>
      </div>

      <div className="vx-editor-topbar__actions flex items-center gap-3.5">
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
        <Button variant="cyanOutline" size="sm" className="uppercase" title="Publish project">
          {/* <CircleCheckBig className="size-4.5 mr-1" /> */}
          <MaterialIcon
            name="published_with_changes"
            fill={1}
            size={20}
            className="mr-1"
          />
          <span className="vx-editor-action-label">Publish</span>
        </Button>

        <Button
          variant="cyanOutline"
          size="sm"
          className="uppercase"
          onClick={onExport}
          disabled={!onExport || isExporting}
          title={exportStatus || "Export project package"}
        >
          {isExporting ? (
            <Loader2 className="mr-1 size-4.5 animate-spin" />
          ) : (
            <MaterialIcon
              name="download_2"
              fill={1}
              size={20}
              className="mr-1"
            />
          )}
          <span className="vx-editor-action-label">
            {isExporting
              ? `Export ${Math.max(0, Math.min(100, Math.round(exportProgress)))}%`
              : "Export"}
          </span>
        </Button>

        <Button disabled variant="cyanOutline" size="sm" className="uppercase" title="Share is not available yet">
          {/* <Share2 className="size-4.5 mr-1" /> */}
          <MaterialIcon name="share" fill={1} size={20} className="mr-1" />
          <span className="vx-editor-action-label">Share</span>
        </Button>

        <UserMenu />
      </div>
    </div>
  );
}
