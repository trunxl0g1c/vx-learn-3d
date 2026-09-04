import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MaterialIcon from "../../../components/ui/material-icon";

const PANEL_WIDTH = 176;
const MENU_ITEM_HEIGHT = 44;
const GAP = 6;

export default function ContentRowMenu({
  onDelete,
  onRevoke,
  onDuplicate,
  onExport,
  onAssignToClassroom,
  onShareToWorkspace,
  hasActiveLock = false,
  isCurrentUserOwner = false,
  canDelete = true,
  canDuplicate = true,
  canExport = true,
  canAssignToClassroom = false,
  canShareToWorkspace = false,
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const showRevoke = hasActiveLock && isCurrentUserOwner;
  const itemCount =
    (showRevoke ? 1 : 0) +
    (canExport ? 1 : 0) +
    (canDuplicate ? 1 : 0) +
    (canAssignToClassroom ? 1 : 0) +
    (canShareToWorkspace ? 1 : 0) +
    (canDelete ? 1 : 0);
  const estimatedHeight = MENU_ITEM_HEIGHT * Math.max(itemCount, 1) + 8;

  // The table this menu lives in scrolls both ways (overflow-x-auto) and
  // sits inside an overflow-hidden card — an absolutely-positioned panel
  // would get clipped by either ancestor. Portaling to <body> with a
  // viewport-relative (fixed) position, computed from the trigger button's
  // own rect, sidesteps that entirely.
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

  if (itemCount === 0) return null;

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
        aria-label="Content actions"
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
            {showRevoke && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onRevoke?.();
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-white transition hover:bg-white/5"
              >
                <MaterialIcon name="block" size={18} />
                Revoke edit access
              </button>
            )}

            {canExport && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onExport?.();
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-white transition hover:bg-white/5"
              >
                <MaterialIcon name="download_2" size={18} />
                Export
              </button>
            )}

            {canDuplicate && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onDuplicate?.();
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-white transition hover:bg-white/5"
              >
                <MaterialIcon name="content_copy" size={18} />
                Duplicate
              </button>
            )}

            {canAssignToClassroom && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onAssignToClassroom?.();
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-white transition hover:bg-white/5"
              >
                <MaterialIcon name="school" size={18} />
                Assign to Classroom
              </button>
            )}

            {canShareToWorkspace && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onShareToWorkspace?.();
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-white transition hover:bg-white/5"
              >
                <MaterialIcon name="share" size={18} />
                Share to Workspace
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onDelete?.();
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-red-300 transition hover:bg-white/5"
              >
                <MaterialIcon name="delete" size={18} />
                Delete
              </button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
