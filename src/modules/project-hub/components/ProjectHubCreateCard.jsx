import { PlusCircle } from "lucide-react";

export default function ProjectHubCreateCard({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer flex h-50 w-full flex-col items-center justify-center rounded-lg border border-secondary-dark bg-dark text-white transition hover:border-accent-main hover:bg-white/2"
    >
      <PlusCircle className="w-12! h-12! text-accent-main" />

      <span className="text-sm font-normal mt-6">Create New Project</span>
    </button>
  );
}
