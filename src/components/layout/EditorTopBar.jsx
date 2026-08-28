import { CircleCheckBig, Loader2, CloudOff } from "lucide-react";
import Button from "../ui/button";
import MaterialIcon from "../ui/material-icon";
import UserMenu from "../../modules/auth/components/UserMenu";
import { EDITOR_TOP_BAR_HEIGHT } from "../../constants/editorLayout";
import EditorUserMenu from "./EditorUserMenu";
import useFullscreen from "../../hooks/useFullscreen";
import { getCurrentUserName } from "../../utils/authUser";

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

function BulkUpdateButton({ syncStatus, pendingSync, hasRemote, onClick }) {
  if (!hasRemote) return null;

  const isSyncing = syncStatus === "syncing";
  const isError = syncStatus === "error";

  let variant = "cyanOutline";
  if (isError) variant = "destructive";
  else if (pendingSync) variant = "cyanSolid";

  let label = "Bulk Update";
  if (isSyncing) label = "Updating...";
  else if (isError) label = "Retry Update";

  return (
    <Button
      variant={variant}
      size="sm"
      className="uppercase"
      onClick={onClick}
      disabled={isSyncing}
      title="Push local changes (chapters, flows, settings) to the database"
    >
      {isSyncing ? (
        <Loader2 className="mr-1 size-4.5 animate-spin" />
      ) : (
        <MaterialIcon name="cloud_upload" fill={1} size={20} className="mr-1" />
      )}
      <span className="vx-editor-action-label">{label}</span>
      {!isSyncing && pendingSync && !isError && (
        <span
          className="ml-1 size-1.5 rounded-full bg-amber-400"
          title="Unsynced local changes"
        />
      )}
    </Button>
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
  onBulkUpdate,
  syncStatus = "idle",
  pendingSync = false,
  hasRemote = false,
  onPublish,
  isPublishing = false,
  publishStatus = "DRAFT",
}) {
  const currentUserName = getCurrentUserName();
  const { isFullscreen, isSupported, toggleFullscreen } = useFullscreen();

  let publishLabel = "Publish";
  if (isPublishing) publishLabel = "Publishing...";
  else if (publishStatus === "PUBLISHED") publishLabel = "Published";

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

        <span className="vx-editor-topbar__title max-w-[34vw] truncate font-normal text-xl">
          {title || "VX Learn 3D"}
        </span>

        <div className="vx-editor-topbar__save">
          <SaveStatusBadge status={saveStatus} />
        </div>
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
        <Button
          variant={isFullscreen ? "default" : "cyanOutline"}
          size="sm"
          className={
            isFullscreen
              ? "border-accent-main shadow-[0_0_14px_rgba(3,105,157,0.55)]"
              : ""
          }
          onClick={toggleFullscreen}
          disabled={!isSupported}
          aria-pressed={isFullscreen}
          title={isFullscreen ? "Exit full screen" : "Full screen"}
        >
          <MaterialIcon
            name={isFullscreen ? "fullscreen_exit" : "fullscreen"}
            fill={1}
            size={22}
          />
        </Button>

        <BulkUpdateButton
          syncStatus={syncStatus}
          pendingSync={pendingSync}
          hasRemote={hasRemote}
          onClick={onBulkUpdate}
        />

        <Button
          variant={publishStatus === "PUBLISHED" ? "cyanSolid" : "cyanOutline"}
          size="sm"
          className="uppercase"
          onClick={onPublish}
          disabled={!onPublish || !hasRemote || isPublishing}
          title={
            publishStatus === "PUBLISHED"
              ? "Republish with the latest changes"
              : "Publish this content — required before it can be shared or assigned to a classroom"
          }
        >
          {isPublishing ? (
            <Loader2 className="mr-1 size-4.5 animate-spin" />
          ) : (
            <MaterialIcon
              name="published_with_changes"
              fill={1}
              size={20}
              className="mr-1"
            />
          )}
          <span className="vx-editor-action-label">{publishLabel}</span>
        </Button>

        {/* <Button
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
        </Button> */}

        {/* <EditorDataMenu
          onExportData={onExportData}
          onImportData={onImportData}
          isExporting={isExporting}
          exportMode={exportMode}
          exportProgress={exportProgress}
          exportStatus={exportStatus}
          isImporting={isImportingData}
          importStatus={importDataStatus}
        /> */}

        {/* <Button
          disabled
          variant="cyanOutline"
          size="sm"
          className="uppercase"
          title="Share is not available yet"
        >
          <Share2 className="size-4.5 mr-1" />
          <MaterialIcon name="share" fill={1} size={20} className="mr-1" />
          <span className="vx-editor-action-label">Share</span>
        </Button> */}

        {/* <UserMenu /> */}

        <EditorUserMenu
          currentUserName={currentUserName}
          onExport={onExport}
          onExportData={onExportData}
          onImportData={onImportData}
          isExporting={isExporting}
          exportMode={exportMode}
          exportProgress={exportProgress}
          exportStatus={exportStatus}
          isImporting={isImportingData}
          importStatus={importDataStatus}
        />
      </div>
    </div>
  );
}
