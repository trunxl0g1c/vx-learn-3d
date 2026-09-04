import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import Button from "../ui/button";
import MaterialIcon from "../ui/material-icon";

export default function EditorDataMenu({
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
  const isExportingData = isExporting && exportMode === "data-only";
  const isBusy = isExporting || isImporting;
  const activeStatus = isImporting
    ? importStatus
    : isExportingData
      ? exportStatus
      : "Export or import project data without replacing the current GLB";

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

  const handleExport = () => {
    setOpen(false);
    onExportData?.();
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
    <div ref={menuRef} className="vx-editor-data-menu relative">
      <Button
        type="button"
        variant="cyanOutline"
        size="sm"
        className="uppercase whitespace-nowrap"
        onClick={() => setOpen((current) => !current)}
        disabled={isBusy || (!onExportData && !onImportData)}
        title={activeStatus}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {isExportingData || isImporting ? (
          <Loader2 className="mr-1 size-4.5 animate-spin" />
        ) : (
          <MaterialIcon
            name="database"
            fill={1}
            size={20}
            className="mr-1"
          />
        )}
        <span className="vx-editor-action-label">
          {isExportingData
            ? `Data ${Math.max(0, Math.min(100, Math.round(exportProgress)))}%`
            : isImporting
              ? "Importing..."
              : "Data"}
        </span>
        {!isBusy && (
          <MaterialIcon
            name="arrow_drop_down"
            fill={1}
            size={18}
            className={`vx-editor-data-menu__chevron transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </Button>

      {open && (
        <div
          role="menu"
          className="vx-editor-data-menu__panel absolute right-0 top-[calc(100%+8px)] z-[320] w-48 overflow-hidden rounded-xl border border-divider-main bg-[#111b1d] p-1.5 shadow-[0_18px_45px_rgba(0,0,0,0.48)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleExport}
            disabled={!onExportData || isBusy}
            className="vx-editor-data-menu__item flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <MaterialIcon name="download_2" fill={1} size={19} />
            <span>Export Data</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={handleImportRequest}
            disabled={!onImportData || isBusy}
            className="vx-editor-data-menu__item flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <MaterialIcon name="upload_file" fill={1} size={19} />
            <span>Import Data</span>
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
