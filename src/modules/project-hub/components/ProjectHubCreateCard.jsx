import MaterialIcon from "../../../components/ui/material-icon";

export default function ProjectHubCreateCard({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[190px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-secondary-dark bg-dark px-4 text-center text-white transition hover:border-accent-main hover:bg-dark-alpha/72 sm:min-h-[200px] xl:min-h-[210px]"
    >
      <MaterialIcon
        name="add_circle"
        size={55}
        className="text-accent-main"
      />
      <span className="mt-5 text-sm font-normal sm:mt-6">
        Create New Project
      </span>
    </button>
  );
}
