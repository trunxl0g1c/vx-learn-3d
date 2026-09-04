import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  X,
} from "lucide-react";
import MaterialIcon from "../ui/material-icon";

function safeExternalUrl(value) {
  const source = String(value || "").trim();
  if (!source) return "";

  try {
    const url = new URL(source);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function LicenseRow({ label, value, field, copiedField, onCopy }) {
  const displayValue = String(value || "").trim() || "-";

  return (
    <div className="grid min-h-11 grid-cols-[minmax(80px,42%)_minmax(0,1fr)_30px] overflow-hidden rounded-lg border border-grayout-extra-dark/70 bg-[#182223E5] text-xs">
      <div className="flex items-center border-r border-divider-main px-2.5 font-medium text-secondary-default bg-primary">
        {label}
      </div>
      <div className="flex min-w-0 items-center px-2.5 text-white">
        <span className="line-clamp-2 break-words leading-4">{displayValue}</span>
      </div>
      <button
        type="button"
        onClick={() => onCopy?.(field, displayValue)}
        disabled={displayValue === "-"}
        title={`Copy ${label}`}
        className="cursor-pointer grid place-items-center border-l border-divider-main text-white/75 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        {copiedField === field ? (
          <MaterialIcon name="check" className="size-4 text-emerald-300" />
        ) : (
          <Copy className="size-4" />
        )}
      </button>
    </div>
  );
}

export default function Player3DLicense({
  models = [],
  hidden = false,
  avoidBottomPanel = false,
}) {
  const licenseModels = Array.isArray(models) ? models : [];
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [copiedField, setCopiedField] = useState("");

  useEffect(() => {
    if (activeIndex < licenseModels.length) return;
    setActiveIndex(Math.max(0, licenseModels.length - 1));
  }, [activeIndex, licenseModels.length]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key === "ArrowLeft" && licenseModels.length > 1) {
        setActiveIndex((index) =>
          index <= 0 ? licenseModels.length - 1 : index - 1,
        );
      }
      if (event.key === "ArrowRight" && licenseModels.length > 1) {
        setActiveIndex((index) =>
          index >= licenseModels.length - 1 ? 0 : index + 1,
        );
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [licenseModels.length, open]);

  const activeModel = licenseModels[activeIndex] || licenseModels[0] || null;
  const sourceUrl = useMemo(
    () => safeExternalUrl(activeModel?.sourceUrl),
    [activeModel?.sourceUrl],
  );

  if (hidden || licenseModels.length === 0) return null;

  const goPrevious = () => {
    setCopiedField("");
    setActiveIndex((index) =>
      index <= 0 ? licenseModels.length - 1 : index - 1,
    );
  };

  const goNext = () => {
    setCopiedField("");
    setActiveIndex((index) =>
      index >= licenseModels.length - 1 ? 0 : index + 1,
    );
  };

  const copyValue = async (field, value) => {
    if (!value || value === "-") return;
    try {
      await navigator.clipboard?.writeText?.(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(""), 1200);
    } catch {
      setCopiedField("");
    }
  };

  const triggerPosition = avoidBottomPanel
    ? "right-2 top-16 md:right-5 md:top-20"
    : "right-2 bottom-[68px] md:right-5 md:bottom-5";

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className={`cursor-pointer vx-player-license-trigger absolute z-[55] inline-flex h-8 items-center gap-2 rounded-full border border-secondary-default/30 bg-dark-alpha/85 px-3 text-[11px] font-medium text-secondary-default shadow-lg backdrop-blur-md transition hover:border-secondary-default hover:bg-[#182526] hover:text-white ${triggerPosition}`}
        title="3D License"
      >
        <MaterialIcon name="copyright" fill size={20} />
        <span>3D License</span>
      </button>

      {open && activeModel && (
        <div className="absolute bottom-5 right-2 z-1500 w-75 max-w-[calc(100vw-16px)] md:right-5">
          <section className="flex max-h-[60vh] w-full flex-col overflow-hidden rounded-2xl border border-[#31464a] bg-[#172020]/97 text-white shadow-[0_20px_50px_rgba(0,0,0,0.55)]">
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#31464a]/70 px-3.5 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-normal">
                  {activeModel.modelName || "3D Model"}
                </h2>
                {licenseModels.length > 1 && (
                  <p className="mt-0.5 text-[10px] text-secondary-default">
                    {activeIndex + 1}/{licenseModels.length}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {licenseModels.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goPrevious}
                      className="grid size-7 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                      title="Previous GLB"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="grid size-7 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                      title="Next GLB"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cursor-pointer grid size-7 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                  title="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                <LicenseRow
                  label="Model Name"
                  value={activeModel.modelName}
                  field="modelName"
                  copiedField={copiedField}
                  onCopy={copyValue}
                />
                <LicenseRow
                  label="Creator Name"
                  value={activeModel.creatorName}
                  field="creatorName"
                  copiedField={copiedField}
                  onCopy={copyValue}
                />
                <LicenseRow
                  label="License"
                  value={activeModel.license}
                  field="license"
                  copiedField={copiedField}
                  onCopy={copyValue}
                />
              </div>

              <div className="mt-3">
                {sourceUrl ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#ae9d5d] px-3 text-xs font-medium text-white transition hover:bg-[#ae9d5d]/10"
                  >
                    <ExternalLink className="size-4 text-secondary-default" />
                    Source
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-white/30"
                  >
                    <ExternalLink className="size-4" />
                    Source unavailable
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
