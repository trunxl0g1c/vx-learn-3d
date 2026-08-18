import { ImageIcon, X } from "lucide-react";
import Button from "../../../components/ui/button";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import UploadProgressRing from "../../../components/ui/upload-progress-ring";

export default function DuplicateContentDialog({
  open,
  onClose,
  sourceTitle,
  name,
  setName,
  file,
  setFile,
  progress,
  progressLabel,
  isSubmitting,
  glbValidation,
  isValidatingGlb,
  error,
  onClearError,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-999 grid place-items-center bg-black/45 backdrop-blur-sm">
      <div className="w-125 overflow-hidden rounded-[20px] bg-dark-alpha text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="flex h-18 items-center justify-between bg-dark-alpha px-5">
          <h2 className="text-base font-normal">
            Duplicate &ldquo;{sourceTitle || "Untitled"}&rdquo;
          </h2>

          {!isSubmitting && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="grid size-9 cursor-pointer place-items-center rounded-lg text-[#69cbe3] hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="size-6" />
            </button>
          )}
        </div>

        {isSubmitting ? (
          <UploadProgressRing progress={progress} label={progressLabel} />
        ) : (
          <>
            <div className="space-y-6 px-5 pb-5 pt-4">
              <InlineAlert type="error" message={error} autoHide={false} />

              <div className="space-y-2">
                <label className="block text-sm font-normal text-contrast-grayout">
                  New Project Name
                </label>

                <div className="relative">
                  <Input
                    value={name}
                    maxLength={64}
                    placeholder="Type project name here"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                    onChange={(event) => {
                      setName(event.target.value);
                      onClearError?.();
                    }}
                    disabled={isSubmitting}
                    className={[
                      "h-[44px] rounded-lg bg-dark-alpha!",
                      error ? "border-warning-main!" : "",
                    ].join(" ")}
                    inputClassName="text-sm italic"
                  />

                  <span className="absolute bottom-2 right-3 text-[9px] font-normal text-contrast-grayout">
                    {name.length}/64
                  </span>
                </div>
              </div>

              <label className="mb-4 flex min-h-35 cursor-pointer items-center gap-6 rounded-lg border border-grayout-dark bg-dark-alpha px-5 transition hover:border-secondary-default">
                <div className="grid size-20 shrink-0 place-items-center rounded border border-secondary-default bg-secondary-dark text-grayout-main!">
                  <ImageIcon className="size-9 text-grayout-main" />
                </div>

                <div className="min-w-0">
                  {file ? (
                    <>
                      <strong className="block truncate text-sm font-semibold text-white">
                        {file.name}
                      </strong>
                      <p className="mt-1 text-xs text-secondary-default">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <strong className="text-sm font-normal text-white">
                      Add the new 3D file in glb format
                    </strong>
                  )}
                </div>

                <input
                  type="file"
                  accept=".glb"
                  hidden
                  disabled={isSubmitting}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>

              {isValidatingGlb && (
                <div className="mb-3 rounded-lg border border-[#315263] bg-dark-alpha p-3 text-xs text-secondary-default">
                  Checking GLB...
                </div>
              )}

              {glbValidation && (
                <div
                  className={[
                    "mb-3 rounded-lg border p-3 text-xs",
                    glbValidation.valid
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                      : "border-red-400/40 bg-red-500/10 text-red-200",
                  ].join(" ")}
                >
                  <span className="text-sm">
                    {glbValidation.valid
                      ? "GLB is compatible"
                      : "GLB has issues"}
                  </span>

                  {glbValidation.info && (
                    <p className="mt-1">
                      Meshes: {glbValidation.info.meshes} · Materials:{" "}
                      {glbValidation.info.materials} · Textures:{" "}
                      {glbValidation.info.textures} · Animations:{" "}
                      {glbValidation.info.animations}
                    </p>
                  )}

                  {glbValidation.warnings?.map((warning, index) => (
                    <p key={`warning-${index}`} className="mt-1">
                      ⚠ {warning}
                    </p>
                  ))}

                  {glbValidation.errors?.map((glbError, index) => (
                    <p key={`error-${index}`} className="mt-1">
                      ✕ {glbError}
                    </p>
                  ))}
                </div>
              )}

              <InlineAlert
                type="info"
                autoHide={false}
                message="Chapters and markers reference parts of the original 3D model. Since this copy uses a new model file, those links won't carry over automatically — you can re-link them afterward in the editor."
              />
            </div>

            <div className="flex gap-4 border-t border-[#315263] px-6 py-6">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 rounded-xl border-accent-contrast! bg-transparent text-base font-normal tracking-[4px]"
              >
                CANCEL
              </Button>

              <Button
                variant="gold"
                onClick={onSubmit}
                disabled={isSubmitting}
                className="flex-1 rounded-xl text-base font-normal tracking-[4px]"
              >
                SUBMIT
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
