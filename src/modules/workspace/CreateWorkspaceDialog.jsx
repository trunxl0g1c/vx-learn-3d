import { useEffect, useMemo, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import Button from "../../components/ui/button";
import Input from "../../components/ui/input";
import InlineAlert from "../../components/ui/inline-alert";
import { useAlert } from "../../components/dialog/AlertContext";
import {
  useCreateWorkspace,
  useUploadWorkspaceThumbnail,
} from "./api/workspaces";
import { slugify } from "../../utils/slugify";

const NAME_MAX_LENGTH = 40;
const DESCRIPTION_MAX_LENGTH = 200;
const THUMBNAIL_ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024;

export default function CreateWorkspaceDialog({ open, onClose, onCreated }) {
  const { showAlert } = useAlert();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [error, setError] = useState("");

  const thumbnailPreviewUrl = useMemo(
    () => (thumbnailFile ? URL.createObjectURL(thumbnailFile) : ""),
    [thumbnailFile],
  );

  useEffect(() => {
    return () => {
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    };
  }, [thumbnailPreviewUrl]);

  const createWorkspace = useCreateWorkspace();
  const uploadThumbnail = useUploadWorkspaceThumbnail();

  if (!open) return null;

  const isSubmitting = createWorkspace.isPending || uploadThumbnail.isPending;

  function handleClose() {
    if (isSubmitting) return;

    onClose?.();
  }

  function handleThumbnailChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!THUMBNAIL_ALLOWED_TYPES.has(file.type)) {
      showAlert({
        title: "Unsupported file",
        message: "Workspace thumbnails must be PNG, JPEG, or WebP.",
        type: "error",
      });
      return;
    }

    if (file.size > THUMBNAIL_MAX_BYTES) {
      showAlert({
        title: "File too large",
        message: "Workspace thumbnails must be 5MB or smaller.",
        type: "error",
      });
      return;
    }

    setThumbnailFile(file);
  }

  async function handleSubmit() {
    setError("");

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Workspace name is required.");
      return;
    }

    const slug = slugify(trimmedName);

    if (!slug) {
      setError("Workspace name must contain at least one letter or number.");
      return;
    }

    try {
      const workspace = await createWorkspace.mutateAsync({
        name: trimmedName,
        slug,
        description: description.trim(),
      });

      if (thumbnailFile && workspace?.id) {
        try {
          await uploadThumbnail.mutateAsync({
            id: workspace.id,
            file: thumbnailFile,
          });
        } catch {
          showAlert({
            title: "Workspace created",
            message:
              "The workspace was created, but the thumbnail failed to upload. You can try again from the workspace's Overview tab.",
            type: "warning",
          });
        }
      }

      onCreated?.(workspace);
    } catch (mutationError) {
      setError(
        mutationError?.response?.data?.message ||
          "Error encountered while creating workspace.",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-999 grid place-items-center bg-black/45 backdrop-blur-sm">
      <div className="w-125 overflow-hidden rounded-[20px] bg-dark-alpha text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="flex h-18 items-center justify-between bg-dark-alpha px-5">
          <h2 className="text-base font-normal">Create Workspace</h2>

          {!isSubmitting && (
            <button
              type="button"
              onClick={handleClose}
              className="grid size-9 cursor-pointer place-items-center rounded-lg text-[#69cbe3] hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="size-6" />
            </button>
          )}
        </div>

        <div className="space-y-6 px-5 pb-5 pt-4">
          <InlineAlert type="error" message={error} autoHide={false} />

          <label className="flex w-full cursor-pointer items-center gap-4 rounded-lg border border-grayout-dark bg-dark-alpha px-5 py-4 text-left transition hover:border-secondary-default">
            <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded border border-secondary-default bg-secondary-dark text-grayout-main!">
              {thumbnailPreviewUrl ? (
                <img
                  src={thumbnailPreviewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon className="size-6 text-grayout-main" />
              )}
            </div>

            <strong className="text-sm font-normal text-white">
              {thumbnailFile ? thumbnailFile.name : "Add Workspace Thumbnail"}
            </strong>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              disabled={isSubmitting}
              onChange={handleThumbnailChange}
            />
          </label>

          <div className="space-y-2">
            <label className="block text-sm font-normal text-contrast-grayout">
              Workspace Name
            </label>

            <div className="relative">
              <Input
                value={name}
                maxLength={NAME_MAX_LENGTH}
                placeholder="Type project name here"
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                disabled={isSubmitting}
                className={[
                  "h-[44px] rounded-lg bg-dark-alpha!",
                  error ? "border-warning-main!" : "",
                ].join(" ")}
                inputClassName="text-sm italic"
              />

              <span className="absolute bottom-2 right-3 text-[9px] font-normal text-contrast-grayout">
                {name.length}/{NAME_MAX_LENGTH}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-normal text-contrast-grayout">
              Description
            </label>

            <div className="relative">
              <textarea
                value={description}
                maxLength={DESCRIPTION_MAX_LENGTH}
                placeholder="Type a short description here"
                onChange={(event) => setDescription(event.target.value)}
                disabled={isSubmitting}
                rows={3}
                className="w-full resize-none rounded-lg border border-grayout-dark bg-dark-alpha px-4 py-3 text-sm italic text-white outline-none placeholder:text-contrast-grayout focus:border-secondary-default"
              />

              <span className="absolute bottom-2 right-3 text-[9px] font-normal text-contrast-grayout">
                {description.length}/{DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 border-t border-[#315263] px-6 py-6">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border-accent-contrast! bg-transparent text-base font-normal tracking-[4px]"
          >
            CANCEL
          </Button>

          <Button
            variant="gold"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 rounded-xl text-base font-normal tracking-[4px]"
          >
            {isSubmitting ? "CREATING..." : "SUBMIT"}
          </Button>
        </div>
      </div>
    </div>
  );
}
