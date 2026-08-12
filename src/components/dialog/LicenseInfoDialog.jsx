import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "../ui/button";
import InlineAlert from "../ui/inline-alert";
import { useLicenseInfo } from "../../modules/license/api/license";

function formatDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function QuotaBar({ label, used, max }) {
  const hasMax = typeof max === "number" && max > 0;
  const ratio = hasMax && typeof used === "number" ? Math.min(used / max, 1) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/70">{label}</span>
        <span className="font-medium text-white">
          {used ?? "—"}
          {hasMax ? ` / ${max}` : ""}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-accent-main transition-all duration-300"
          style={{ width: `${hasMax ? ratio * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

function formatFeatureValue(value) {
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";

  return String(value);
}

export default function LicenseInfoDialog({ open, onClose }) {
  const titleId = useId();

  const {
    data: license,
    isLoading,
    isError,
    error,
  } = useLicenseInfo({ enabled: open });

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const handleBackdropMouseDown = (event) => {
    if (event.target === event.currentTarget) onClose?.();
  };

  const expiresLabel = formatDate(license?.expiresAt);

  return createPortal(
    <div
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
      className="fixed inset-0 z-[1100] grid place-items-center bg-black/45 p-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[420px] overflow-hidden rounded-[22px] border border-divider-main bg-[#151d1d] text-white shadow-[0_22px_45px_rgba(0,0,0,0.55)]"
      >
        <div className="flex min-h-[70px] items-center justify-between bg-dark-alpha px-5">
          <h3 id={titleId} className="text-xl font-normal tracking-[-0.2px]">
            License Information
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="grid size-10 cursor-pointer place-items-center rounded-lg text-secondary-default transition hover:bg-white/5"
            aria-label="Close license information"
          >
            <X strokeWidth={2.2} className="size-7" />
          </button>
        </div>

        <div className="space-y-5 px-7 py-7">
          {isError && (
            <InlineAlert
              type="error"
              autoHide={false}
              message={
                error?.response?.data?.message ||
                "Failed to load license information."
              }
            />
          )}

          {isLoading && (
            <div className="space-y-3">
              {[0, 1].map((index) => (
                <div
                  key={index}
                  className="h-10 animate-pulse rounded-lg bg-white/5"
                />
              ))}
            </div>
          )}

          {!isLoading && !isError && license && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Licensed to</span>
                <span className="font-medium text-white">
                  {license.licenseTo}
                </span>
              </div>

              {expiresLabel && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Expires</span>
                  <span className="font-medium text-white">
                    {expiresLabel}
                  </span>
                </div>
              )}

              {license.quotas.length > 0 && (
                <div className="space-y-4">
                  {license.quotas.map((quota) => (
                    <QuotaBar key={quota.key} {...quota} />
                  ))}
                </div>
              )}

              {license.otherFeatures.length > 0 && (
                <div className="space-y-2 border-t border-divider-main pt-4">
                  {license.otherFeatures.map((feature) => (
                    <div
                      key={feature.key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-white/60">{feature.label}</span>
                      <span className="font-medium text-white">
                        {formatFeatureValue(feature.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {license.quotas.length === 0 &&
                license.otherFeatures.length === 0 && (
                  <p className="text-sm text-white/60">
                    No usage limits reported for this license.
                  </p>
                )}
            </>
          )}
        </div>

        <div className="border-t border-divider-main px-6 py-5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full rounded-xl"
          >
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
