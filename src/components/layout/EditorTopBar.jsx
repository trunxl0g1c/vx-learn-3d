import { CircleCheckBig, Loader2, CloudOff } from "lucide-react";
import Button from "../ui/button";
import { getCurrentUserName } from "../../utils/authUser";
import MaterialIcon from "../ui/material-icon";
import { EDITOR_TOP_BAR_HEIGHT } from "../../constants/editorLayout";
import EditorDataMenu from "./EditorDataMenu";

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
  onExportData,
  onImportData,
  isImportingData = false,
  importDataStatus = "",
  isExporting = false,
  exportMode = null,
  exportProgress = 0,
  exportStatus = "",
}) {
  const currentUserName = getCurrentUserName();

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
          disabled={!onExport || isExporting || isImportingData}
          title={
            exportMode === "full" && exportStatus
              ? exportStatus
              : "Export full project package with GLB"
          }
        >
          {isExporting && exportMode === "full" ? (
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
            {isExporting && exportMode === "full"
              ? `Export ${Math.max(0, Math.min(100, Math.round(exportProgress)))}%`
              : "Export"}
          </span>
        </Button>

        <EditorDataMenu
          onExportData={onExportData}
          onImportData={onImportData}
          isExporting={isExporting}
          exportMode={exportMode}
          exportProgress={exportProgress}
          exportStatus={exportStatus}
          isImporting={isImportingData}
          importStatus={importDataStatus}
        />

        <Button disabled variant="cyanOutline" size="sm" className="uppercase" title="Share is not available yet">
          {/* <Share2 className="size-4.5 mr-1" /> */}
          <MaterialIcon name="share" fill={1} size={20} className="mr-1" />
          <span className="vx-editor-action-label">Share</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex border-none items-center"
          title={currentUserName || "Guest"}
        >
          <span className="vx-editor-topbar__user-name text-base">{currentUserName || "Guest"}</span>
          {/* <ChevronDown className="size-4.5" /> */}
          <MaterialIcon
            name="arrow_back_2"
            fill={1}
            size={20}
            className="vx-editor-user-chevron -rotate-90"
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
