import { hydrateProjectFromBackend } from "./api/projectHydrate";

// Shared by classroom-member and content-public viewing surfaces (neither
// grants a real WorkspaceMember row, so they must never land in the
// Editor) — always forces role: "PLAYER" regardless of what the caller
// passes, documenting the invariant rather than relying on it as an
// incidental side effect of the caller's own role computation.
export async function openContentInPlayer({
  workspaceId,
  contentId,
  showLoading,
  updateLoading,
  hideLoading,
  navigate,
  title,
}) {
  showLoading?.({
    title: "Opening Viqubed Project",
    text: title || "Content",
    progress: null,
  });

  try {
    const hydrated = await hydrateProjectFromBackend({
      workspaceId,
      contentId,
      role: "PLAYER",
    });

    updateLoading?.({ text: "Preparing viewer..." });
    navigate(`/viqubed/player/${hydrated.id}`);
  } catch (error) {
    hideLoading?.();
    throw error;
  }
}
