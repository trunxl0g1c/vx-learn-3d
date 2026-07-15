import { ImageIcon } from "lucide-react";
import MaterialIcon from "../../ui/material-icon";

export default function ChapterMediaSection({
  chapter,
  addChapterMedia,
  deleteChapterMedia,
}) {
  const mediaList = Array.isArray(chapter?.media) ? chapter.media : [];

  const imageMedia = mediaList.filter((media) => media.type === "image");

  const videoMedia = mediaList.filter((media) => media.type === "video");

  const pdfMedia = mediaList.filter((media) => media.type === "pdf");

  const handleAddMedia = (type, file) => {
    if (!file || !chapter?.id) return;

    addChapterMedia?.(chapter.id, type, file);
  };

  const handleDeleteMedia = (event, mediaId) => {
    event.stopPropagation();

    if (!chapter?.id || !mediaId) return;

    deleteChapterMedia?.(chapter.id, mediaId);
  };

  return (
    <section className="space-y-3 p-4">
      <div className="text-sm font-normal text-contrast-grayout">Media</div>

      <div className="space-y-3">
        {imageMedia.length === 0 ? (
          <MediaUploadButton
            icon={<MaterialIcon name="add" fill={1} size={45} />}
            label="Add Image Gallery"
            accept="image/*"
            onFileChange={(file) => {
              handleAddMedia("image", file);
            }}
          />
        ) : (
          <ImageGalleryContainer
            mediaList={imageMedia}
            onAddMedia={(file) => {
              handleAddMedia("image", file);
            }}
            onDeleteMedia={(event, mediaId) => {
              handleDeleteMedia(event, mediaId);
            }}
          />
        )}

        {videoMedia.length === 0 ? (
          <MediaUploadButton
            icon={<MaterialIcon name="videocam" fill={1} size={45} />}
            label="Add Video"
            accept="video/*"
            onFileChange={(file) => {
              handleAddMedia("video", file);
            }}
          />
        ) : (
          <FileMediaContainer
            mediaList={videoMedia}
            type="video"
            addLabel="Add Other Video"
            accept="video/*"
            addIconName="videocam"
            itemIconName="videocam"
            onAddMedia={(file) => {
              handleAddMedia("video", file);
            }}
            onDeleteMedia={(event, mediaId) => {
              handleDeleteMedia(event, mediaId);
            }}
          />
        )}

        {pdfMedia.length === 0 ? (
          <MediaUploadButton
            icon={<MaterialIcon name="picture_as_pdf" fill={1} size={45} />}
            label="Add PDF Document"
            accept="application/pdf,.pdf"
            onFileChange={(file) => {
              handleAddMedia("pdf", file);
            }}
          />
        ) : (
          <FileMediaContainer
            mediaList={pdfMedia}
            type="pdf"
            addLabel="Add Other PDF Document"
            accept="application/pdf,.pdf"
            addIconName="picture_as_pdf"
            itemIconName="picture_as_pdf"
            onAddMedia={(file) => {
              handleAddMedia("pdf", file);
            }}
            onDeleteMedia={(event, mediaId) => {
              handleDeleteMedia(event, mediaId);
            }}
          />
        )}
      </div>
    </section>
  );
}

function ImageGalleryContainer({ mediaList, onAddMedia, onDeleteMedia }) {
  return (
    <MediaContainer>
      {mediaList.map((media) => (
        <ImageMediaItem
          key={media.id}
          media={media}
          onDelete={(event) => {
            onDeleteMedia?.(event, media.id);
          }}
        />
      ))}

      <AddOtherMediaButton
        iconName="add"
        label="Add Other Image"
        accept="image/*"
        onFileChange={onAddMedia}
      />
    </MediaContainer>
  );
}

function FileMediaContainer({
  mediaList,
  type,
  addLabel,
  accept,
  addIconName,
  itemIconName,
  onAddMedia,
  onDeleteMedia,
}) {
  return (
    <MediaContainer>
      {mediaList.map((media) => (
        <FileMediaItem
          key={media.id}
          media={media}
          type={type}
          iconName={itemIconName}
          onDelete={(event) => {
            onDeleteMedia?.(event, media.id);
          }}
        />
      ))}

      <AddOtherMediaButton
        iconName={addIconName}
        label={addLabel}
        accept={accept}
        onFileChange={onAddMedia}
      />
    </MediaContainer>
  );
}

function MediaContainer({ children }) {
  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
      }}
      className={[
        "space-y-2 rounded-lg",
        "border border-grayout-dark",
        "bg-dark-alpha p-3",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function MediaUploadButton({ icon, label, accept, onFileChange }) {
  return (
    <label
      onClick={(event) => {
        event.stopPropagation();
      }}
      className={[
        "flex h-24 w-full cursor-pointer items-center gap-4",
        "rounded-lg border border-divider-main",
        "bg-dark-alpha p-2",
        "text-sm font-normal text-white",
        "transition-colors duration-200",
        "hover:border-secondary-default",
        "hover:bg-dark-alpha/80",
      ].join(" ")}
    >
      <span
        className={[
          "grid h-20 w-24 shrink-0 place-items-center",
          "rounded-sm border border-secondary-default",
          "bg-secondary-dark",
          "text-contrast-grayout",
        ].join(" ")}
      >
        {icon}
      </span>

      <span className="min-w-0 truncate">{label}</span>

      <HiddenFileInput accept={accept} onFileChange={onFileChange} />
    </label>
  );
}

function AddOtherMediaButton({ iconName, label, accept, onFileChange }) {
  return (
    <label
      onClick={(event) => {
        event.stopPropagation();
      }}
      className={[
        "flex h-20 w-full cursor-pointer items-center gap-4",
        "rounded-lg",
        "text-sm font-normal text-white",
        "transition-colors duration-200",
        "hover:bg-white/3",
      ].join(" ")}
    >
      <span
        className={[
          "grid h-20 w-24 shrink-0 place-items-center",
          "rounded-sm border border-secondary-default",
          "bg-secondary-dark",
          "text-contrast-grayout",
          "transition-colors duration-200",
          "hover:border-accent-main",
        ].join(" ")}
      >
        <MaterialIcon name={iconName} fill={1} size={45} />
      </span>

      <span className="min-w-0 truncate">{label}</span>

      <HiddenFileInput accept={accept} onFileChange={onFileChange} />
    </label>
  );
}

function ImageMediaItem({ media, onDelete }) {
  const imageCaption =
    media.caption || media.description || media.name || "Image";

  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
      }}
      className={[
        "flex h-18 w-full items-center",
        "overflow-hidden rounded-lg",
        "border border-secondary-default",
        "bg-dark-alpha",
        "transition-colors duration-200",
        "hover:border-accent-main",
      ].join(" ")}
    >
      <div
        className={[
          "grid h-full w-24 shrink-0 place-items-center",
          "overflow-hidden",
          "border-r border-secondary-default",
          "bg-secondary-dark",
        ].join(" ")}
      >
        {media.data ? (
          <img
            src={media.data}
            alt={imageCaption}
            className="size-full object-cover"
          />
        ) : (
          <ImageIcon
            className="size-7 text-contrast-grayout"
            strokeWidth={1.5}
          />
        )}
      </div>

      <div className="min-w-0 flex-1 px-4">
        <div className="line-clamp-2 text-sm font-normal leading-5 text-white">
          {imageCaption}
        </div>
      </div>

      <DeleteMediaButton label={`Delete ${imageCaption}`} onClick={onDelete} />
    </div>
  );
}

function FileMediaItem({ media, type, iconName, onDelete }) {
  const mediaLabel =
    media.caption ||
    media.description ||
    media.name ||
    (type === "video" ? "Video" : "PDF Document");

  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
      }}
      className={[
        "flex h-18 w-full items-center",
        "overflow-hidden rounded-lg",
        "border border-secondary-default",
        "bg-dark-alpha",
        "transition-colors duration-200",
        "hover:border-accent-main",
      ].join(" ")}
    >
      <div
        className={[
          "grid h-full w-24 shrink-0 place-items-center",
          "border-r border-secondary-default",
          "bg-secondary-dark",
          "text-contrast-grayout",
        ].join(" ")}
      >
        <MaterialIcon name={iconName} fill={1} size={38} />
      </div>

      <div className="min-w-0 flex-1 px-4">
        <div className="truncate text-sm font-normal text-white">
          {mediaLabel}
        </div>

        <div className="mt-1 text-[10px] uppercase text-contrast-grayout">
          {type === "video" ? "Video" : "PDF Document"}
        </div>
      </div>

      <DeleteMediaButton label={`Delete ${mediaLabel}`} onClick={onDelete} />
    </div>
  );
}

function DeleteMediaButton({ label = "Delete media", onClick }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
      onClick={onClick}
      className={[
        "mr-3 grid size-9 shrink-0 cursor-pointer place-items-center",
        "rounded-lg text-secondary-default",
        "transition-colors duration-200",
        "hover:bg-white/5",
        "hover:text-white",
      ].join(" ")}
    >
      <MaterialIcon name="delete" fill={1} size={21} />
    </button>
  );
}

function HiddenFileInput({ accept, onFileChange }) {
  return (
    <input
      type="file"
      accept={accept}
      className="hidden"
      onClick={(event) => {
        event.stopPropagation();
      }}
      onChange={(event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        onFileChange?.(file);

        event.target.value = "";
      }}
    />
  );
}
