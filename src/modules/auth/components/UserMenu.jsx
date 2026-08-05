import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/ui/button";
import MaterialIcon from "../../../components/ui/material-icon";
import { useAuth } from "../AuthContext";
import { useLogout } from "../api/logout";

export default function UserMenu({ className = "" }) {
  const navigate = useNavigate();
  const { user, setSession } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const logoutMutation = useLogout({
    onSuccess: () => {
      setSession(null);
      navigate("/login", { replace: true });
    },
    onError: () => {
      // Refresh token was likely already invalid/expired server-side —
      // there is nothing left to revoke, so drop the local session anyway.
      setSession(null);
      navigate("/login", { replace: true });
    },
  });

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const displayName = user?.name || user?.username || "Guest";

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <Button
        variant="outline"
        size="sm"
        className="flex min-w-0 items-center border-none px-1! sm:px-3!"
        title={displayName}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="vx-editor-topbar__user-name max-w-[96px] truncate text-sm sm:max-w-[180px] sm:text-base">
          {displayName}
        </span>
        <MaterialIcon
          name="arrow_back_2"
          fill={1}
          size={20}
          className={`vx-editor-user-chevron hidden -rotate-90 transition-transform sm:block ${open ? "rotate-90" : ""}`}
        />
        <MaterialIcon
          name="account_circle"
          fill
          size={30}
          className="shrink-0 text-accent-main"
        />
      </Button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-lg border border-divider-main bg-primary py-1 shadow-xl">
          <div className="border-b border-divider-main px-4 py-2.5">
            <p className="truncate text-sm font-medium text-white">
              {displayName}
            </p>
            {user?.username && (
              <p className="truncate text-xs text-secondary-default">
                {user.username}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-red-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            <MaterialIcon name="logout" size={18} />
            {logoutMutation.isPending ? "Logging out..." : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}
