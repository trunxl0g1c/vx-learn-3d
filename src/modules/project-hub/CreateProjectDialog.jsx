import { ImageIcon, Play, SquarePen, X } from "lucide-react";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import InlineAlert from "../../components/ui/inline-alert";

export default function CreateProjectDialog({
  open,
  onClose,
  projectName,
  setProjectName,
  file,
  setFile,
  createRole,
  setCreateRole,
  onSubmit,
  progress,
  isSubmitting,
  glbValidation,
  isValidatingGlb,
  error,
  onClearError,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-999 grid place-items-center bg-black/45 backdrop-blur-sm">
      <div className="w-125 overflow-hidden rounded-[20px] bg-dark-alpha text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="flex h-18 items-center justify-between bg-dark-alpha px-5">
          <h2 className="text-base font-normal">Create Project</h2>

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
          <>
            <div className="px-6 py-2">
              <div className="flex items-center gap-6">
                <div className="relative flex size-20 items-center justify-center">
                  <svg className="-rotate-90 h-15 w-15" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="#4c3f72"
                      strokeWidth="8"
                      fill="none"
                    />

                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      stroke="#0EA5E9"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={264}
                      strokeDashoffset={264 - (264 * progress) / 100}
                      className="transition-all duration-300"
                    />
                  </svg>

                  <span className="absolute text-lg font-semibold text-accent-main">
                    {progress}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-normal">
                    Your project is being uploaded & prepared. Please be
                    patient...
                  </h3>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-6 px-5 pb-5 pt-4">
              <InlineAlert type="error" message={error} />

              <div className="space-y-2">
                <label className="block text-sm font-normal text-contrast-grayout">
                  Project Name
                </label>

                <div className="relative">
                  <Input
                    value={projectName}
                    maxLength={16}
                    placeholder="Type project name here"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                    onChange={(event) => {
                      setProjectName(event.target.value);
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
                    {projectName.length}/16
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
                      Add your 3D files with glb format
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

                  {glbValidation.errors?.map((error, index) => (
                    <p key={`error-${index}`} className="mt-1">
                      ✕ {error}
                    </p>
                  ))}
                </div>
              )}

              <div className="mb-4">
                <label className="mb-2 block text-sm font-normal text-contrast-grayout">
                  Access Mode
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {/* <button
                type="button"
                onClick={() => setCreateRole("EDITOR")}
                disabled={isSubmitting}
                className={[
                  "cursor-pointer h-10 rounded-lg border text-sm transition disabled:pointer-events-none disabled:opacity-50",
                  createRole === "EDITOR"
                    ? "border-[#63c7e5] bg-[#63c7e5]/15 text-white"
                    : "border-[#315263] bg-transparent text-secondary-default hover:bg-white/5",
                ].join(" ")}
              >
                <SquarePen className="size-6" /> Editor
              </button> */}

                  <Button
                    size="sm"
                    variant={
                      createRole === "EDITOR" ? "cyanSolid" : "cyanOutline"
                    }
                    onClick={() => {
                      setCreateRole("EDITOR");
                      onClearError?.();
                    }}
                    disabled={isSubmitting}
                  >
                    <SquarePen className="size-4" />
                    Editor
                  </Button>

                  <Button
                    size="sm"
                    variant={
                      createRole === "PLAYER" ? "cyanSolid" : "cyanOutline"
                    }
                    onClick={() => {
                      setCreateRole("PLAYER");
                      onClearError?.();
                    }}
                    disabled={isSubmitting}
                  >
                    <Play className="size-4" />
                    Player
                  </Button>
                </div>
              </div>

              {isSubmitting && (
                <div className="rounded-lg bg-dark-alpha p-3">
                  <div className="mb-2 flex justify-between text-xs text-secondary-default">
                    <span>Uploading GLB...</span>
                    <span>{progress}%</span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-black/40">
                    <div
                      className="h-full rounded-full bg-[#63c7e5] transition-all duration-200"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
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
