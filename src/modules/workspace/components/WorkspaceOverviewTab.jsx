import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import Button from "../../../components/ui/button";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import { useAlert } from "../../../components/dialog/AlertContext";
import {
  getWorkspaceThumbnailUrl,
  useUpdateWorkspace,
  useUploadWorkspaceThumbnail,
} from "../api/workspaces";

const NAME_MAX_LENGTH = 40;
const DESCRIPTION_MAX_LENGTH = 200;
const THUMBNAIL_ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const THUMBNAIL_MAX_BYTES = 5 * 1024 * 1024;

export default function WorkspaceOverviewTab({
  workspaceId,
  workspace,
  isLoading,
}) {
  const { showAlert } = useAlert();

  // `draftName`/`draftDescription` stay undefined until the user edits the
  // field, so the inputs track the loaded workspace without needing an
  // effect to sync them.
  const [draftName, setDraftName] = useState(undefined);
  const [draftDescription, setDraftDescription] = useState(undefined);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  const [failedThumbnailUrl, setFailedThumbnailUrl] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const name = draftName ?? workspace?.name ?? "";
  const description = draftDescription ?? workspace?.description ?? "";

  useEffect(() => {
    return () => {
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    };
  }, [thumbnailPreviewUrl]);

  const updateWorkspace = useUpdateWorkspace({
    onSuccess: () => {
      setSuccessMessage("Workspace updated successfully.");
    },
    onError: (mutationError) => {
      setError(
        mutationError?.response?.data?.message ||
          "Error encountered while updating workspace.",
      );
    },
  });

  const uploadThumbnail = useUploadWorkspaceThumbnail({
    onSuccess: () => {
      setSuccessMessage("Workspace thumbnail updated successfully.");
    },
    onError: (mutationError) => {
      setError(
        mutationError?.response?.data?.message ||
          "Error encountered while uploading thumbnail.",
      );
    },
  });

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

    setError("");
    setSuccessMessage("");
    setThumbnailPreviewUrl(URL.createObjectURL(file));
    uploadThumbnail.mutate({ id: workspaceId, file });
  }

  function handleSubmit() {
    setError("");
    setSuccessMessage("");

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Workspace name is required.");
      return;
    }

    updateWorkspace.mutate({
      id: workspaceId,
      name: trimmedName,
      description: description.trim(),
    });
  }

  const isSaving = updateWorkspace.isPending;
  const isUploadingThumbnail = uploadThumbnail.isPending;
  const displayedThumbnail =
    thumbnailPreviewUrl ||
    (workspace?.thumbnail
      ? getWorkspaceThumbnailUrl(workspaceId, workspace?.modifiedAt)
      : "");
  const showThumbnailImage =
    displayedThumbnail && displayedThumbnail !== failedThumbnailUrl;

  return (
    <div className="max-w-lg space-y-6">
      <InlineAlert type="error" message={error} autoHide={false} />
      <InlineAlert type="success" message={successMessage} />

      <label
        className={[
          "flex w-[132px] h-[88px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-grayout-dark bg-dark-alpha transition hover:border-secondary-default",
          isLoading || isUploadingThumbnail
            ? "pointer-events-none opacity-50"
            : "",
        ].join(" ")}
      >
        {showThumbnailImage ? (
          <img
            src={displayedThumbnail}
            alt={workspace?.name}
            onError={() => setFailedThumbnailUrl(displayedThumbnail)}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="size-8 text-grayout-main" />
        )}

        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          disabled={isLoading || isUploadingThumbnail}
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
            onChange={(event) => {
              setDraftName(event.target.value);
              setError("");
              setSuccessMessage("");
            }}
            disabled={isLoading || isSaving}
            className={[
              "h-[44px] rounded-lg bg-dark-alpha!",
              error ? "border-warning-main!" : "",
            ].join(" ")}
            inputClassName="text-sm"
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
            onChange={(event) => {
              setDraftDescription(event.target.value);
              setError("");
              setSuccessMessage("");
            }}
            disabled={isLoading || isSaving}
            rows={4}
            className="w-full resize-none rounded-lg border border-grayout-dark bg-dark-alpha px-4 py-3 text-sm text-white outline-none placeholder:text-contrast-grayout focus:border-secondary-default"
          />

          <span className="absolute bottom-2 right-3 text-[9px] font-normal text-contrast-grayout">
            {description.length}/{DESCRIPTION_MAX_LENGTH}
          </span>
        </div>
      </div>

      <Button
        variant="gold"
        onClick={handleSubmit}
        disabled={isLoading || isSaving}
        className="rounded-xl text-sm font-normal w-44 tracking-widest"
      >
        {isSaving ? "SAVING..." : "EDIT"}
      </Button>
    </div>
  );
}
