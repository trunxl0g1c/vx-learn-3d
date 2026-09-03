import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MaterialIcon from "../../../components/ui/material-icon";

const PANEL_WIDTH = 200;
const MENU_ITEM_HEIGHT = 44;
const GAP = 6;
const ITEM_COUNT = 4;

export default function UserRowMenu({
  isActive,
  isTogglingActive = false,
  disableToggleActive = false,
  disableToggleActiveReason,
  disableDelete = false,
  disableDeleteReason,
  onEdit,
  onChangePassword,
  onToggleActive,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const estimatedHeight = MENU_ITEM_HEIGHT * ITEM_COUNT + 8;

  // The users table scrolls both ways (overflow-x-auto) inside an
  // overflow-hidden card — an absolutely-positioned panel would get clipped
  // by either ancestor. Portaling to <body> with a viewport-relative (fixed)
  // position, computed from the trigger button's own rect, sidesteps that
  // entirely. Mirrors ContentRowMenu's identical approach.
  const updatePosition = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const openUpward =
      rect.bottom + GAP + estimatedHeight > window.innerHeight;

    setPosition({
      top: openUpward ? rect.top - GAP - estimatedHeight : rect.bottom + GAP,
      left: Math.min(
        rect.right - PANEL_WIDTH,
        window.innerWidth - PANEL_WIDTH - GAP,
      ),
    });
  }, [estimatedHeight]);

  useEffect(() => {
    if (!open) return undefined;

    function handleClickOutside(event) {
      if (
        panelRef.current?.contains(event.target) ||
        buttonRef.current?.contains(event.target)
      ) {
        return;
      }

      setOpen(false);
    }

    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [open]);

  const toggleActiveLabel = isTogglingActive
    ? "Updating…"
    : `${isActive ? "Deactivate" : "Activate"} User`;

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        onClick={() => {
          if (!open) updatePosition();
          setOpen((value) => !value);
        }}
        className="grid size-8 cursor-pointer place-items-center rounded-lg text-secondary-default transition hover:bg-white/10"
        aria-label="User actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MaterialIcon name="more_vert" size={20} />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={{ top: position.top, left: position.left, width: PANEL_WIDTH }}
            className="fixed z-1000 overflow-hidden rounded-lg border border-divider-main bg-primary py-1 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit?.();
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-white transition hover:bg-white/5"
            >
              <MaterialIcon name="edit" size={18} />
              Edit User
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onChangePassword?.();
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-white transition hover:bg-white/5"
            >
              <MaterialIcon name="lock_reset" size={18} />
              Change Password
            </button>

            <button
              type="button"
              role="menuitem"
              disabled={disableToggleActive || isTogglingActive}
              title={disableToggleActive ? disableToggleActiveReason : undefined}
              onClick={() => {
                setOpen(false);
                onToggleActive?.();
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <MaterialIcon name={isActive ? "toggle_off" : "toggle_on"} size={18} />
              {toggleActiveLabel}
            </button>

            <button
              type="button"
              role="menuitem"
              disabled={disableDelete}
              title={disableDelete ? disableDeleteReason : undefined}
              onClick={() => {
                setOpen(false);
                onDelete?.();
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-red-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <MaterialIcon name="delete" size={18} />
              Delete User
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
