import { ChevronDown, CircleUser } from "lucide-react";
import Button from "../../../components/ui/button";
import { getCurrentUserName } from "../../../utils/authUser";

export default function ProjectHubNavbar() {
  const currentUserName = getCurrentUserName();

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-divider-main bg-primary px-6">
      <div className="flex items-center gap-3">
        <img
          src="/images/logo.svg"
          alt="VXplore Studio"
          className="h-8 w-8 rounded-full"
        />
        <span className="text-2xl font-normal text-accent-main">
          VXplore <span className="text-secondary-default">Studio</span>
        </span>
      </div>
      <div className="flex items-center gap-5">
        <Button
          variant="outline"
          size="sm"
          className="flex border-none items-center"
        >
          <span className="text-base">{currentUserName || "Jhon"}</span>
          <ChevronDown className="size-4.5" />
          <CircleUser className="size-7" color="#03699D" />
        </Button>
      </div>
    </header>
  );
}
