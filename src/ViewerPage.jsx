import { useNavigate } from "react-router-dom";
import ViewerPageLayout from "./components/layout/ViewerPageLayout";
import ContentLockedScreen from "./components/layout/ContentLockedScreen";
import ForcedActionDialog from "./components/dialog/ForcedActionDialog";
import { useViewerPageController } from "./hooks/useViewerPageController";
import { CONTENT_LOCK_IDLE_TIMEOUT_MS } from "./constants/contentLock";

function formatIdleDuration(ms) {
  const minutes = Math.round(ms / 60_000);

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

// The "revoked" copy stays deliberately non-committal between "the owner
// removed you" and "your session went stale" — a heartbeat failure can't
// tell those two apart on the wire (see useContentEditLock.js).
const KICKED_COPY = {
  idle: {
    title: "Removed due to inactivity",
    message: `You haven't done anything for the last ${formatIdleDuration(CONTENT_LOCK_IDLE_TIMEOUT_MS)}. You've been removed from this content so someone else can edit it.`,
  },
  revoked: {
    title: "Removed from editing",
    message:
      "You've been removed from editing this content — either the workspace owner removed you, or your session expired.",
  },
};

export default function ViewerPage() {
  const controller = useViewerPageController();
  const navigate = useNavigate();

  if (controller.lockConflict) {
    return (
      <ContentLockedScreen
        lockedByUser={controller.lockConflict.lockedByUser}
      />
    );
  }

  if (controller.kicked) {
    const copy = KICKED_COPY[controller.kicked.reason] || KICKED_COPY.revoked;

    return (
      <ForcedActionDialog
        open
        title={copy.title}
        message={copy.message}
        actionText="Back to Viqubed"
        onAction={() => {
          controller.dismissKicked();
          navigate("/viqubed");
        }}
      />
    );
  }

  return <ViewerPageLayout controller={controller} />;
}
