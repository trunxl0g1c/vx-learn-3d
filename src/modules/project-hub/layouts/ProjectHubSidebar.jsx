import { lazy, Suspense, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Button, { cn } from "../../../components/ui/button";
import MaterialIcon from "../../../components/ui/material-icon";

const LicenseInfoDialog = lazy(
  () => import("../../../components/dialog/LicenseInfoDialog"),
);

const menus = [
  {
    title: "My Catalogue",
    href: "/viqubed",
    match: "/viqubed",
    icon: "package_2",
  },
  {
    title: "Workspace",
    href: "/workspace",
    match: "/workspace",
    icon: "work",
  },

  { divider: true },

  {
    title: "License Information",
    action: "license",
    icon: "license",
  },
  {
    title: "Profile",
    href: "/profile",
    match: "/profile",
    icon: "manage_accounts",
  },

  { divider: true },

  {
    title: "Documentation",
    href: "/documentation",
    match: "/documentation",
    icon: "book_3",
  },
  {
    title: "Support",
    href: "/support",
    match: "/support",
    icon: "support_agent",
  },
];

export default function ProjectHubSidebar() {
  const location = useLocation();
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);

  return (
    <aside className="w-[56px] shrink-0 overflow-y-auto border-r border-divider-main bg-primary sm:w-[68px] lg:w-[220px]">
      <nav className="flex flex-col gap-1 p-1.5 sm:p-2 lg:p-3">
        {menus.map((item, index) => {
          if (item.divider) {
            return (
              <div
                key={`divider-${index}`}
                className="my-2 border-t border-divider-main"
              />
            );
          }

          if (item.action === "license") {
            return (
              <div key="license-information" title={item.title}>
                <Button
                  type="button"
                  variant="sidebar"
                  size="sm"
                  onClick={() => setIsLicenseOpen(true)}
                  className="w-full justify-center px-2 hover:bg-accent-main/80! lg:justify-start lg:gap-3 lg:px-3"
                >
                  <MaterialIcon
                    name={item.icon}
                    fill={1}
                    size={20}
                    className="shrink-0 text-secondary-default"
                  />

                  <span className="hidden truncate lg:inline">
                    {item.title}
                  </span>
                </Button>
              </div>
            );
          }

          const isActive =
            item.match === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.match);

          return (
            <Link
              key={item.href}
              to={item.href}
              className="block"
              title={item.title}
            >
              <Button
                type="button"
                variant="sidebar"
                size="sm"
                className={cn(
                  "w-full justify-center px-2 lg:justify-start lg:gap-3 lg:px-3",
                  isActive
                    ? "bg-accent-main! text-white hover:bg-accent-main!"
                    : "hover:bg-accent-main/80!",
                )}
              >
                <MaterialIcon
                  name={item.icon}
                  fill={1}
                  size={20}
                  className={cn(
                    "shrink-0",
                    isActive ? "text-white" : "text-secondary-default",
                  )}
                />

                <span className="hidden truncate lg:inline">{item.title}</span>
              </Button>
            </Link>
          );
        })}
      </nav>

      {isLicenseOpen && (
        <Suspense fallback={null}>
          <LicenseInfoDialog
            open
            onClose={() => setIsLicenseOpen(false)}
          />
        </Suspense>
      )}
    </aside>
  );
}
