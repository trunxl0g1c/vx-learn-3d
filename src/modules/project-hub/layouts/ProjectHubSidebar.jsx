import { Link, useLocation } from "react-router-dom";
import Button, { cn } from "../../../components/ui/button";
import MaterialIcon from "../../../components/ui/material-icon";

const menus = [
  {
    title: "My Catalogue",
    href: "/vxplore",
    match: "/vxplore",
    icon: "package_2",
  },
  {
    title: "Workspace",
    href: "/workspace",
    match: "/workspace",
    icon: "work",
  },
  {
    title: "Library",
    href: "/library",
    match: "/library",
    icon: "video_library",
  },

  { divider: true },

  {
    title: "Assets Marketplace",
    href: "/marketplace",
    match: "/marketplace",
    icon: "shopping_cart",
  },
  {
    title: "VR Learn",
    href: "/learn",
    match: "/learn",
    icon: "movie",
  },
  {
    title: "GLB Compression",
    href: "/glb",
    match: "/glb",
    icon: "compress",
  },

  { divider: true },

  {
    title: "Profile",
    href: "/profile",
    match: "/profile",
    icon: "manage_accounts",
  },
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

  return (
    <aside className="w-[220px] shrink-0 border-r border-divider-main bg-primary">
      <nav className="flex flex-col gap-1 p-3">
        {menus.map((item, index) => {
          if (item.divider) {
            return (
              <div
                key={`divider-${index}`}
                className="my-2 border-t border-divider-main"
              />
            );
          }

          const isActive =
            item.match === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.match);

          return (
            <Link key={item.href} to={item.href} className="block">
              <Button
                type="button"
                variant="sidebar"
                size="sm"
                className={cn(
                  "w-full justify-start gap-3 px-3",
                  isActive &&
                    "bg-accent-dark! text-white hover:bg-accent-dark! hover:text-white!",
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

                <span>{item.title}</span>
              </Button>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
