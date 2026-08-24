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
    <div className="grid min-h-14 grid-cols-[minmax(100px,40%)_minmax(0,1fr)_38px] overflow-hidden rounded-xl border border-[#405257]/70 bg-black/10 text-sm sm:grid-cols-[170px_minmax(0,1fr)_42px]">
      <div className="flex items-center border-r border-[#405257]/70 px-3 font-medium text-secondary-default sm:px-4">
        {label}
      </div>
      <div className="flex min-w-0 items-center px-3 text-white sm:px-4">
        <span className="line-clamp-2 break-words leading-5">{displayValue}</span>
      </div>
      <button
        type="button"
        onClick={() => onCopy?.(field, displayValue)}
        disabled={displayValue === "-"}
        title={`Copy ${label}`}
        className="grid place-items-center border-l border-[#405257]/70 text-white/75 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
      >
        {copiedField === field ? (
          <MaterialIcon name="check" className="size-5 text-emerald-300" />
        ) : (
          <Copy className="size-5" />
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
        className={`vx-player-license-trigger absolute z-[55] inline-flex h-8 items-center gap-2 rounded-full border border-secondary-default/30 bg-dark-alpha/85 px-3 text-[11px] font-medium text-secondary-default shadow-lg backdrop-blur-md transition hover:border-secondary-default hover:bg-[#182526] hover:text-white ${triggerPosition}`}
        title="3D License"
      >
        <MaterialIcon name="copyright" fill className="size-4" />
        <span>3D License</span>
      </button>

      {open && activeModel && (
        <div
          className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="relative w-full max-w-[900px] md:px-14">
            {licenseModels.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrevious}
                  className="absolute left-0 top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/45 text-white/80 transition hover:bg-black/70 hover:text-white md:grid"
                  title="Previous GLB"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-0 top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/45 text-white/80 transition hover:bg-black/70 hover:text-white md:grid"
                  title="Next GLB"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}

            <section className="mx-auto flex max-h-[88dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-[24px] border border-[#31464a] bg-[#172020]/97 text-white shadow-[0_30px_90px_rgba(0,0,0,0.6)] sm:rounded-[28px]">
              <header className="flex shrink-0 items-center justify-between gap-3 px-5 pb-4 pt-5 sm:px-7 sm:pb-5 sm:pt-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold sm:text-2xl">3D License</h2>
                    {licenseModels.length > 1 && (
                      <span className="rounded-full border border-secondary-default/30 bg-secondary-default/10 px-2 py-0.5 text-[11px] text-secondary-default">
                        {activeIndex + 1}/{licenseModels.length}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-white/45">
                    {activeModel.modelName || "3D Model"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid size-10 shrink-0 place-items-center rounded-xl text-white transition hover:bg-white/10"
                  title="Close"
                >
                  <X className="size-7" />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 sm:px-7 sm:pb-7">
                <div className="space-y-2.5">
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

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  {sourceUrl ? (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#ae9d5d] px-4 text-sm font-medium text-white transition hover:bg-[#ae9d5d]/10"
                    >
                      <ExternalLink className="size-5 text-secondary-default" />
                      Source
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-white/30"
                    >
                      <ExternalLink className="size-5" />
                      Source unavailable
                    </button>
                  )}

                  {licenseModels.length > 1 && (
                    <div className="flex items-center gap-2 md:hidden">
                      <button
                        type="button"
                        onClick={goPrevious}
                        className="grid size-10 place-items-center rounded-full border border-white/10 bg-black/20 text-white/80"
                        title="Previous GLB"
                      >
                        <ChevronLeft className="size-5" />
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        className="grid size-10 place-items-center rounded-full border border-white/10 bg-black/20 text-white/80"
                        title="Next GLB"
                      >
                        <ChevronRight className="size-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
