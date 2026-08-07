import { Lock, X } from "lucide-react";
import Button from "../../../components/ui/button";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import UploadProgressRing from "../../../components/ui/upload-progress-ring";

export default function ExportContentDialog({
  open,
  onClose,
  sourceTitle,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  progress,
  progressLabel,
  isSubmitting,
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
            Export &ldquo;{sourceTitle || "Untitled"}&rdquo;
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
                  Password
                </label>

                <Input
                  type="password"
                  value={password}
                  maxLength={128}
                  placeholder="Enter a password to encrypt this package"
                  leftIcon={<Lock className="size-4.5" />}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    onClearError?.();
                  }}
                  disabled={isSubmitting}
                  className="h-[44px] rounded-lg bg-dark-alpha!"
                  inputClassName="text-sm italic"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-normal text-contrast-grayout">
                  Confirm Password
                </label>

                <Input
                  type="password"
                  value={confirmPassword}
                  maxLength={128}
                  placeholder="Re-enter the same password"
                  leftIcon={<Lock className="size-4.5" />}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    onClearError?.();
                  }}
                  disabled={isSubmitting}
                  className="h-[44px] rounded-lg bg-dark-alpha!"
                  inputClassName="text-sm italic"
                />
              </div>

              <InlineAlert
                type="info"
                autoHide={false}
                message="The exported .vxenc file (3D model, chapters, flows, procedures, and gallery media) is encrypted with this password. Anyone importing it will need the exact same password — there is no way to recover it if lost."
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
