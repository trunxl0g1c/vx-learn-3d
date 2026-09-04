import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import Button from "../ui/button";
import MaterialIcon from "../ui/material-icon";

export default function EditorUserMenu({
  currentUserName = "",
  onExport,
  onExportData,
  onImportData,
  isExporting = false,
  exportMode = null,
  exportProgress = 0,
  exportStatus = "",
  isImporting = false,
  importStatus = "",
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const isExportingFull = isExporting && exportMode === "full";
  const isExportingData = isExporting && exportMode === "data-only";
  const isBusy = isExporting || isImporting;
  const userLabel = currentUserName || "Guest";

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const closeAndRun = (callback) => {
    setOpen(false);
    callback?.();
  };

  const handleImportRequest = () => {
    setOpen(false);
    inputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";

    if (file) {
      await onImportData?.(file);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex items-center border-none"
        onClick={() => setOpen((current) => !current)}
        title={userLabel}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="vx-editor-topbar__user-name text-base">
          {userLabel}
        </span>
        <MaterialIcon
          name="arrow_back_2"
          fill={1}
          size={20}
          className={`vx-editor-user-chevron transition-transform ${
            open ? "rotate-90" : "-rotate-90"
          }`}
        />
        <MaterialIcon
          name="account_circle"
          fill
          size={30}
          className="text-accent-main"
        />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-[320] w-64 overflow-hidden rounded-xl border border-divider-main bg-[#111b1d] p-1.5 text-white shadow-[0_18px_45px_rgba(0,0,0,0.48)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => closeAndRun(onExport)}
            disabled={!onExport || isBusy}
            title={
              isExportingFull && exportStatus
                ? exportStatus
                : "Export full project package with GLB"
            }
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isExportingFull ? (
              <Loader2 className="size-4.5 animate-spin text-secondary-default" />
            ) : (
              <MaterialIcon
                name="download_2"
                fill={1}
                size={19}
                className="text-secondary-default"
              />
            )}
            <div className="min-w-0 flex-1">
              <div>Export</div>
              <div className="mt-0.5 truncate text-[10px] text-white/45">
                {isExportingFull
                  ? `${Math.max(0, Math.min(100, Math.round(exportProgress)))}%`
                  : "Full project package"}
              </div>
            </div>
          </button>

          <div className="my-1 border-t border-white/10" />

          <div className="px-3 pb-1 pt-1.5 text-[10px] font-normal uppercase tracking-[0.14em] text-white/40">
            Data
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => closeAndRun(onExportData)}
            disabled={!onExportData || isBusy}
            title={isExportingData && exportStatus ? exportStatus : "Export project data"}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isExportingData ? (
              <Loader2 className="size-4.5 animate-spin text-secondary-default" />
            ) : (
              <MaterialIcon
                name="download_2"
                fill={1}
                size={19}
                className="text-secondary-default"
              />
            )}
            <span>
              {isExportingData
                ? `Export Data ${Math.max(0, Math.min(100, Math.round(exportProgress)))}%`
                : "Export Data"}
            </span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={handleImportRequest}
            disabled={!onImportData || isBusy}
            title={isImporting && importStatus ? importStatus : "Import project data"}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isImporting ? (
              <Loader2 className="size-4.5 animate-spin text-secondary-default" />
            ) : (
              <MaterialIcon
                name="upload_file"
                fill={1}
                size={19}
                className="text-secondary-default"
              />
            )}
            <span>{isImporting ? "Importing..." : "Import Data"}</span>
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".viqdata"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
