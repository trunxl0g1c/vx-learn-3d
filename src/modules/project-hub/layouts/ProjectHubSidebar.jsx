import {
  LayoutGrid,
  FolderOpen,
  Library,
  Boxes,
  BookOpen,
  User,
  LifeBuoy,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import Button, { cn } from "../../../components/ui/button";

const menus = [
  {
    title: "My Catalogue",
    href: "/vxplore",
    match: "/vxplore",
    icon: LayoutGrid,
  },
  {
    title: "Workspace",
    href: "/workspace",
    match: "/workspace",
    icon: FolderOpen,
  },
  {
    title: "Library",
    href: "/library",
    match: "/library",
    icon: Library,
  },

  { divider: true },

  {
    title: "Assets Marketplace",
    href: "/marketplace",
    match: "/marketplace",
    icon: Boxes,
  },
  {
    title: "VR Learn",
    href: "/learn",
    match: "/learn",
    icon: BookOpen,
  },
  {
    title: "GLB Compression",
    href: "/glb",
    match: "/glb",
    icon: Boxes,
  },

  { divider: true },

  {
    title: "Profile",
    href: "/profile",
    match: "/profile",
    icon: User,
  },
  {
    title: "Documentation",
    href: "/documentation",
    match: "/documentation",
    icon: BookOpen,
  },
  {
    title: "Support",
    href: "/support",
    match: "/support",
    icon: LifeBuoy,
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

          const Icon = item.icon;

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
                  "w-full justify-start px-3",
                  isActive &&
                    "bg-accent-dark! text-white hover:bg-accent-dark! hover:text-white!",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
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
