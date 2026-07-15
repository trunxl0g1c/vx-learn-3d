import MaterialIcon from "../../../components/ui/material-icon";

export default function ProjectHubCreateCard({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer flex h-50 w-full flex-col items-center justify-center rounded-lg border border-secondary-dark bg-dark text-white transition hover:border-accent-main hover:bg-dark-alpha/72"
    >
      <MaterialIcon
        name="add_circle"
        size={55}
        className="text-accent-main"
      />
      <span className="text-sm font-normal mt-6">Create New Project</span>
    </button>
  );
}
