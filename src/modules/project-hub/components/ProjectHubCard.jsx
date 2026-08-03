import MaterialIcon from "../../../components/ui/material-icon";

export default function ProjectHubCard({
  project,
  onClick,
  onIntent,
  priority = false,
  formatLastOpened,
}) {
  const thumbnail =
    project.thumbnail ||
    project.metadata?.thumbnail ||
    project.metadata?.thumbnailUrl;

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onIntent}
      onFocus={onIntent}
      className="viqubed-project-card min-h-[190px] w-full cursor-pointer overflow-hidden rounded-lg border border-secondary-dark bg-dark text-left transition hover:border-accent-main hover:bg-white/5 sm:min-h-[200px] xl:min-h-[210px]"
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
  );
}
