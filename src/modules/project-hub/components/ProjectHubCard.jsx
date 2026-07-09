import { Play, SquarePen } from "lucide-react";
import MaterialIcon from "../../../components/ui/material-icon";

export default function ProjectHubCard({ project, onClick, formatLastOpened }) {
  const thumbnail =
    project.thumbnail ||
    project.metadata?.thumbnail ||
    project.metadata?.thumbnailUrl;

  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer h-50 w-full overflow-hidden rounded-lg border border-secondary-dark bg-dark text-left transition hover:border-accent-main hover:bg-white/5"
    >
      <div className="h-[132px] w-full overflow-hidden bg-secondary-dark">
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

      <div className="flex h-20 items-center justify-between gap-2 px-3 pt-2 pb-5">
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
            <MaterialIcon name="edit_square" size={20} />
          ) : (
            <MaterialIcon name="play_arrow" size={25} />
          )}
        </div>
      </div>
    </button>
  );
}
