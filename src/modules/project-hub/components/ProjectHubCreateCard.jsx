import { PlusCircle } from "lucide-react";

export default function ProjectHubCreateCard({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer flex h-48.5 w-full flex-col items-center justify-center rounded-lg border border-secondary-dark bg-dark text-white transition hover:border-accent-main hover:bg-white/5"
    >
      <PlusCircle className="w-10! h-10! text-accent-main" />

      <span className="text-sm font-normal mt-4">Create New Project</span>
    </button>
  );
}
