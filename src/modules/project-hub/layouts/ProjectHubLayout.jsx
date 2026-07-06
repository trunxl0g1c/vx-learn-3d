import ProjectHubNavbar from "./ProjectHubNavbar";
import ProjectHubSidebar from "./ProjectHubSidebar";

export default function ProjectHubLayout({ children }) {
  return (
    <div className="flex h-full w-full flex-col bg-primary text-white">
      <ProjectHubNavbar />

      <div className="flex flex-1 overflow-hidden">
        <ProjectHubSidebar />

        <main className="flex-1 overflow-y-auto sm:px-64 py-6">{children}</main>
      </div>
    </div>
  );
}
