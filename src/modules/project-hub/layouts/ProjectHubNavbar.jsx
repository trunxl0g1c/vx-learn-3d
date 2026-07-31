import Button from "../../../components/ui/button";
import { getCurrentUserName } from "../../../utils/authUser";
import MaterialIcon from "../../../components/ui/material-icon";

export default function ProjectHubNavbar() {
  const currentUserName = getCurrentUserName();

  return (
    <header className="flex h-14 w-full shrink-0 items-center justify-between border-b border-divider-main bg-primary px-3 sm:px-5 lg:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <img
          src="/images/logo.svg"
          alt="Viqubed Studio"
          className="h-8 w-8 shrink-0"
        />
        <img
          src="/images/logo-label.svg"
          alt="Viqubed Studio"
          className="hidden h-5.5 w-auto max-w-[170px] sm:block"
        />
      </div>

      <div className="flex min-w-0 items-center gap-2 sm:gap-5">
        <Button
          variant="outline"
          size="sm"
          className="flex min-w-0 items-center border-none px-1! sm:px-3!"
        >
          <span className="max-w-[96px] truncate text-sm sm:max-w-[180px] sm:text-base">
            {currentUserName || "Jhon"}
          </span>
          <MaterialIcon
            name="arrow_back_2"
            fill={1}
            size={20}
            className="hidden -rotate-90 sm:block"
          />
          <MaterialIcon
            name="account_circle"
            fill
            size={30}
            className="shrink-0 text-accent-main"
          />
        </Button>
      </div>
    </header>
  );
}
