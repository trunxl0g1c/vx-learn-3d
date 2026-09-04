import ProjectHubNavbar from "./ProjectHubNavbar";
import ProjectHubSidebar from "./ProjectHubSidebar";

export default function ProjectHubLayout({ children }) {
  return (
    <div className="viqubed-project-hub flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-primary text-white">
      <ProjectHubNavbar />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ProjectHubSidebar />

        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 lg:px-6 xl:px-8 2xl:px-10">
          <div className="mx-auto w-full max-w-[1320px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
