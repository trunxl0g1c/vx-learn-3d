import { useMemo, useRef, useState } from "react";
import MaterialIcon from "../../ui/material-icon";
import Button from "../../ui/button";
import { validateGlbFile } from "../../../utils/glbValidator";

function formatFileSize(bytes = 0) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function ValidationResult({ entry }) {
  const result = entry?.validation;
  const valid = result?.valid === true;

  return (
    <div
      className={[
        "rounded-xl border p-3",
        valid
          ? "border-emerald-400/40 bg-emerald-500/10"
          : "border-red-400/40 bg-red-500/10",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <MaterialIcon
          name={valid ? "check_circle" : "cancel"}
          fill
          className={valid ? "size-5 text-emerald-300" : "size-5 text-red-300"}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white" title={entry.file?.name}>
            {entry.file?.name || "model.glb"}
          </div>
          <div className="mt-1 text-[11px] text-contrast-grayout">
            {formatFileSize(entry.file?.size)}
          </div>

          {result?.info && (
            <div className="mt-2 text-[11px] leading-5 text-white/75">
              Meshes: {result.info.meshes} · Materials: {result.info.materials} · Textures: {result.info.textures} · Animations: {result.info.animations}
            </div>
          )}

          {result?.warnings?.map((warning, index) => (
            <div key={`warning-${index}`} className="mt-1 text-[11px] leading-5 text-amber-200">
              ⚠ {warning}
            </div>
          ))}

          {result?.errors?.map((message, index) => (
            <div key={`error-${index}`} className="mt-1 text-[11px] leading-5 text-red-200">
              ✕ {message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AddMoreGlbPanel({
  models = [],
  onAddFiles,
  onRemoveModel,
  onBack,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [validationOpen, setValidationOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [validationEntries, setValidationEntries] = useState([]);
  const [confirmError, setConfirmError] = useState("");

  const allValid = useMemo(
    () =>
      !validating &&
      pendingFiles.length > 0 &&
      validationEntries.length === pendingFiles.length &&
      validationEntries.every((entry) => entry.validation?.valid === true),
    [pendingFiles, validationEntries, validating],
  );

  const closeValidation = () => {
    if (busy) return;
    setValidationOpen(false);
    setValidating(false);
    setPendingFiles([]);
    setValidationEntries([]);
    setConfirmError("");
  };

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    setError("");
    setConfirmError("");
    setPendingFiles(files);
    setValidationEntries([]);
    setValidationOpen(true);
    setValidating(true);

    try {
      const entries = await Promise.all(
        files.map(async (file) => ({
          file,
          validation: await validateGlbFile(file),
        })),
      );
      setValidationEntries(entries);
    } catch (nextError) {
      setValidationEntries(
        files.map((file) => ({
          file,
          validation: {
            valid: false,
            errors: [nextError?.message || "Failed to validate GLB."],
            warnings: [],
            info: null,
          },
        })),
      );
    } finally {
      setValidating(false);
    }
  };

  const confirmAddFiles = async () => {
    if (!allValid || busy) return;

    setBusy(true);
    setConfirmError("");
    try {
      await onAddFiles?.(pendingFiles);
      closeValidation();
    } catch (nextError) {
      setConfirmError(nextError?.message || "Failed to add GLB.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-[#14201f] px-4">
          <button
            type="button"
            onClick={onBack}
            className="grid size-9 place-items-center rounded-lg text-secondary-default transition hover:bg-white/10"
            title="Back to Pro Tools"
          >
            <MaterialIcon name="arrow_back" className="size-5" />
          </button>
          <div className="text-lg font-normal text-white">Add More GLB</div>
        </div>

        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-4">
          <div className="rounded-xl border border-secondary-default/70 bg-[#171b1b] p-4">
            <div className="mb-3 flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-accent-main/50 bg-accent-main/10 text-secondary-default">
                <MaterialIcon name="deployed_code" fill className="size-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Additional GLB Models</p>
                <p className="mt-1 text-xs leading-5 text-contrast-grayout">
                  Choose GLB files first. Viqubed validates them before you can confirm adding them to the scene.
                </p>
              </div>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".glb"
              multiple
              className="hidden"
              onChange={handleFiles}
            />

            <Button
              type="button"
              variant="outline"
              disabled={busy || validating}
              onClick={() => inputRef.current?.click()}
              className="w-full border-secondary-default!"
            >
              <MaterialIcon name="add" className="mr-2 size-5" />
              Add GLB
            </Button>

            {error && (
              <div className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-secondary-default/70 bg-[#171b1b] p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Added Models</div>
              <div className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-contrast-grayout">
                {models.length}
              </div>
            </div>

            {models.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 px-3 py-5 text-center text-xs leading-5 text-contrast-grayout">
                No additional GLB has been added yet.
              </div>
            ) : (
              <div className="space-y-2">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-primary/40 p-3"
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-secondary-default/40 text-secondary-default">
                      <MaterialIcon name="view_in_ar" className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-white" title={model.fileName || model.name}>
                        {model.fileName || model.name || "Additional model.glb"}
                      </div>
                      <div className="mt-1 text-[11px] text-contrast-grayout">
                        {formatFileSize(model.fileSize || model.size)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveModel?.(model.id)}
                      className="grid size-8 shrink-0 place-items-center rounded-lg text-contrast-grayout transition hover:bg-red-500/10 hover:text-red-300"
                      title="Remove GLB"
                    >
                      <MaterialIcon name="delete" className="size-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {validationOpen && (
        <div className="fixed inset-0 z-[1200] grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="flex max-h-[82vh] w-full max-w-[560px] flex-col overflow-hidden rounded-[20px] border border-divider-main bg-[#151d1d] text-white shadow-[0_24px_70px_rgba(0,0,0,0.6)]">
            <div className="flex min-h-16 items-center justify-between bg-dark-alpha px-5">
              <div>
                <div className="text-base font-medium">Validate Additional GLB</div>
                <div className="mt-0.5 text-xs text-contrast-grayout">
                  GLB must pass validation before it can be added.
                </div>
              </div>
              {!busy && (
                <button
                  type="button"
                  onClick={closeValidation}
                  className="grid size-9 place-items-center rounded-lg text-secondary-default transition hover:bg-white/5"
                  aria-label="Close validation"
                >
                  <MaterialIcon name="close" className="size-5" />
                </button>
              )}
            </div>

            <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto p-5">
              {validating ? (
                <div className="flex min-h-36 items-center justify-center rounded-xl border border-secondary-default/35 bg-white/[0.03] text-sm text-secondary-default">
                  <MaterialIcon name="hourglass_top" className="mr-2 size-5 animate-pulse" />
                  Checking GLB...
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    className={[
                      "rounded-xl border px-4 py-3 text-sm",
                      allValid
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                        : "border-red-400/40 bg-red-500/10 text-red-200",
                    ].join(" ")}
                  >
                    {allValid
                      ? "GLB is compatible. Confirm to add it to this project."
                      : "GLB has issues. Cancel and choose a corrected GLB file."}
                  </div>

                  {validationEntries.map((entry, index) => (
                    <ValidationResult key={`${entry.file?.name || "glb"}-${index}`} entry={entry} />
                  ))}

                  {confirmError && (
                    <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                      {confirmError}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-divider-main px-5 py-4">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={closeValidation}
                  className="flex-1 rounded-xl tracking-[2px]"
                >
                  CANCEL
                </Button>

                {allValid && (
                  <Button
                    type="button"
                    variant="gold"
                    disabled={busy}
                    onClick={confirmAddFiles}
                    className="flex-1 rounded-xl tracking-[2px]"
                  >
                    {busy ? "ADDING..." : "CONFIRM"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
