import { FileText, ImageIcon, Trash2, Video } from "lucide-react";
import Button from "../../ui/button";

export default function ChapterMediaSection({
  chapter,
  addChapterMedia,
  deleteChapterMedia,
}) {
  const mediaList = chapter.media || [];

  return (
    <section className="space-y-3 px-2 pb-4">
      <div className="text-xs font-bold text-contrast-grayout">Media</div>

      <div className="grid gap-2">
        <MediaUploadButton
          icon={<ImageIcon className="size-5" />}
          label="Add Picture"
          accept="image/*"
          onFileChange={(file) => addChapterMedia(chapter.id, "image", file)}
        />

        <MediaUploadButton
          icon={<Video className="size-5" />}
          label="Add Video"
          accept="video/*"
          onFileChange={(file) => addChapterMedia(chapter.id, "video", file)}
        />

        <MediaUploadButton
          icon={<FileText className="size-5" />}
          label="Add PDF Document"
          accept="application/pdf,.pdf"
          onFileChange={(file) => addChapterMedia(chapter.id, "pdf", file)}
        />
      </div>

      {mediaList.length > 0 && (
        <div className="space-y-2 pt-1">
          {mediaList.map((media) => (
            <div
              key={media.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-divider-main bg-primary p-3"
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-white">
                  {media.name}
                </div>
                <div className="text-[10px] uppercase text-contrast-grayout">
                  {media.type}
                </div>
              </div>

              <Button
                size="sm"
                variant="destructive"
                className="shrink-0 gap-1 bg-red-600 px-2 text-white hover:bg-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChapterMedia(chapter.id, media.id);
                }}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MediaUploadButton({ icon, label, accept, onFileChange }) {
  return (
    <label className="flex h-11 cursor-pointer items-center gap-3 rounded-lg border border-secondary-default bg-transparent px-3 text-xs font-semibold text-white transition hover:bg-white/5">
      <span className="text-secondary-default">{icon}</span>
      <span>{label}</span>

      <input
        type="file"
        accept={accept}
        className="hidden"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          onFileChange(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}
