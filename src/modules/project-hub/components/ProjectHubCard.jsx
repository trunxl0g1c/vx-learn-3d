import { Play, SquarePen } from "lucide-react";

export default function ProjectHubCard({ project, onClick, formatLastOpened }) {
  const thumbnail =
    project.thumbnail ||
    project.metadata?.thumbnail ||
    project.metadata?.thumbnailUrl;

  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer h-48.5 w-full overflow-hidden rounded-lg border border-secondary-dark bg-dark text-left transition hover:-translate-y-0.5 hover:border-secondary-dark/80 hover:bg-white/5"
    >
      <div className="h-30 w-full overflow-hidden bg-secondary-dark">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={project.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-secondary-dark" />
        )}
      </div>

      <div className="flex h-[74px] items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-[500] leading-4 text-white">
            {project.name}
          </h3>

          <p className="mt-1 truncate text-xs font-normal text-contrast-grayout">
            {project.workspace || "Workspace Name"}
          </p>

          {/* {formatLastOpened && (
            <p className="mt-0.5 truncate text-[9px] text-contrast-grayout/70">
              {formatLastOpened(project)}
            </p>
          )} */}
        </div>

        <div className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-main text-primary">
          {project.role === "EDITOR" ? (
            <SquarePen className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </div>
      </div>
    </button>
  );
}
