import ProjectHubCreateCard from "./ProjectHubCreateCard";
import ProjectHubImportCard from "./ProjectHubImportCard";
import ProjectHubCard from "./ProjectHubCard";

export default function ProjectHubGrid({
  projects,
  onCreate,
  onImport,
  isImporting,
  onOpenProject,
  getAccessLabel,
  formatLastOpened,
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 min-[480px]:grid-cols-2 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      <ProjectHubCreateCard onClick={onCreate} />
      <ProjectHubImportCard onImport={onImport} isImporting={isImporting} />

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
        <div className="col-span-full flex min-h-28 items-center justify-center rounded-lg border border-secondary-dark bg-dark px-6 py-5 text-center text-sm text-contrast-grayout">
          No projects found
        </div>
      )}
    </div>
  );
}
