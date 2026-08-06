import { useNavigate } from "react-router-dom";
import MaterialIcon from "../ui/material-icon";
import Button from "../ui/button";

// Rendered instead of ViewerPageLayout when useContentEditLock reports a
// conflict — someone else already holds the edit lock on this content. Kept
// deliberately lightweight (no 3D engine, no editor chrome) so a blocked
// user's browser does as little work as possible.
export default function ContentLockedScreen({ lockedByUser }) {
  const navigate = useNavigate();
  const name = lockedByUser?.name || "another user";

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#0b1220",
        color: "white",
      }}
      className="grid place-items-center p-4"
    >
      <div className="w-[min(440px,100%)] rounded-2xl border border-divider-main bg-dark px-7 py-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-accent-main/15 text-accent-main">
          <MaterialIcon name="lock" fill={1} size={28} />
        </div>

        <h1 className="text-lg font-medium">Currently being edited</h1>

        <p className="mt-2 text-sm leading-6 text-white/70">
          This content is currently being edited by{" "}
          <span className="font-medium text-white">{name}</span>. It'll be
          available once they finish or leave.
        </p>

        <Button
          type="button"
          variant="gold"
          onClick={() => navigate("/viqubed")}
          className="mt-6 w-full rounded-xl"
        >
          Back to Viqubed
        </Button>
      </div>
    </div>
  );
}
