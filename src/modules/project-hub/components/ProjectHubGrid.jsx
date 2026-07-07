import ProjectHubCreateCard from "./ProjectHubCreateCard";
import ProjectHubCard from "./ProjectHubCard";

export default function ProjectHubGrid({
  projects,
  onCreate,
  onOpenProject,
  getAccessLabel,
  formatLastOpened,
}) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <ProjectHubCreateCard onClick={onCreate} />

      {projects.map((project) => (
        <ProjectHubCard
          key={project.id}
          project={project}
          onClick={() => onOpenProject(project)}
          getAccessLabel={getAccessLabel}
          formatLastOpened={formatLastOpened}
        />
      ))}

      {projects.length === 0 && (
        <div className="col-span-3 flex items-center justify-center rounded-lg border border-secondary-dark bg-dark px-6 py-5 text-center text-sm text-contrast-grayout">
          No projects found
        </div>
      )}
    </div>
  );
}
