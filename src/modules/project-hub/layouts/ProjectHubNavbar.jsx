import UserMenu from "../../auth/components/UserMenu";

export default function ProjectHubNavbar() {
  return (
    <header className="flex h-14 w-full shrink-0 items-center justify-between border-b border-divider-main bg-primary px-3 sm:px-5 lg:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <img
          src="/images/logo.svg"
          alt="Viqubed Studio"
          className="h-8 w-8 shrink-0"
        />
        <img
          src="/images/label-logo-fill.svg"
          alt="Viqubed Studio"
          className="hidden h-5.5 w-auto max-w-[170px] sm:block"
        />
        <span className="flex flex-col text-contrast-grayout">
          <p className="text-xs font-bold uppercase tracking-widest">Studio</p>
          <p className="text-xs font-normal">V1.0</p>
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2 sm:gap-5">
        <UserMenu />
      </div>
    </header>
  );
}
