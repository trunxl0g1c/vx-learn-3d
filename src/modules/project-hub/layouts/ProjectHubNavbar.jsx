import Button from "../../../components/ui/button";
import { getCurrentUserName } from "../../../utils/authUser";
import MaterialIcon from "../../../components/ui/material-icon";

export default function ProjectHubNavbar() {
  const currentUserName = getCurrentUserName();

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-divider-main bg-primary px-6">
      <div className="flex items-center gap-3">
        <img
          src="/images/logo.svg"
          alt="VXplore Studio"
          className="h-8 w-8"
        />
        <img
          src="/images/logo-label.svg"
          alt="VXplore Studio"
          className="h-5.5 w-full"
        />
        {/* <span className="text-2xl font-normal text-accent-main">
          VXplore <span className="text-secondary-default">Studio</span>
        </span> */}
      </div>
      <div className="flex items-center gap-5">
        <Button
          variant="outline"
          size="sm"
          className="flex border-none items-center"
        >
          <span className="text-base">{currentUserName || "Jhon"}</span>
          <MaterialIcon
            name="arrow_back_2"
            fill={1}
            size={20}
            className="-rotate-90"
          />
          <MaterialIcon
            name="account_circle"
            fill
            size={30}
            className="text-accent-main"
          />
        </Button>
      </div>
    </header>
  );
}
