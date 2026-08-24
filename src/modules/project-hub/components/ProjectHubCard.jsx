import { useState } from "react";
import MaterialIcon from "../../../components/ui/material-icon";

export default function ProjectHubCard({
  project,
  onClick,
  onIntent,
  onDelete,
  priority = false,
  formatLastOpened,
}) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const thumbnail =
    project.thumbnail ||
    project.metadata?.thumbnail ||
    project.metadata?.thumbnailUrl;
  // Cloud-only cards get a URL back regardless of whether the content
  // actually has a thumbnail uploaded (see getContentThumbnailUrl) — a
  // content with none 404s, so this falls back the same way the blank
  // placeholder below always has.
  const showThumbnail = Boolean(thumbnail) && !thumbnailFailed;

  let accessIcon = <MaterialIcon name="play_arrow" size={25} />;
  if (project.isCloudOnly) {
    accessIcon = <MaterialIcon name="cloud" size={20} />;
  } else if (project.role === "EDITOR") {
    accessIcon = <MaterialIcon name="edit_square" size={20} />;
  }

  return (
    <div className="viqubed-project-card group relative min-h-[190px] w-full overflow-hidden rounded-lg border border-secondary-dark bg-dark transition hover:border-accent-main hover:bg-white/5 sm:min-h-[200px] xl:min-h-[210px]">
      <button
        type="button"
        onClick={onClick}
        onPointerDown={onIntent}
        onFocus={onIntent}
        className="h-full min-h-[190px] w-full cursor-pointer text-left sm:min-h-[200px] xl:min-h-[210px]"
      >
        <div className="h-[128px] w-full overflow-hidden bg-secondary-dark sm:h-[132px] xl:h-[140px]">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={project.name}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "low"}
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-secondary-dark" />
          )}
        </div>

        <div className="flex min-h-[62px] items-center justify-between gap-2 px-3 py-2 xl:min-h-[70px]">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-[500] leading-4 text-white sm:text-base">
              {project.name}
            </h3>

            <p className="mt-1 truncate text-[11px] font-normal text-contrast-grayout sm:text-xs">
              {project.workspace || "Workspace Name"}
            </p>
          </div>

          <div className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-main text-primary">
            {project.role === "EDITOR" ? (
              <MaterialIcon name="edit_square" size={20} />
            ) : (
              <MaterialIcon name="play_arrow" size={25} />
            )}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onDelete?.(project)}
        className="absolute right-2 top-2 z-10 grid size-8 cursor-pointer place-items-center rounded-lg border border-red-400/30 bg-black/70 text-red-300 shadow-lg backdrop-blur-sm transition hover:border-red-400/60 hover:bg-red-950/90 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        aria-label={`Delete ${project.name || "project"}`}
        title="Delete project"
      >
        <MaterialIcon name="delete" size={19} />
      </button>
    </div>
  );
}
