import { useEffect, useRef } from "react";

export default function PlayerXRMobileOverlay({ interaction = null, xr = null }) {
  const overlayRef = useRef(null);
  const viewModel =
    interaction?.viewModel ||
    (xr?.activeMode
      ? {
          eyebrow: "VIQUBED XR",
          title: "Learning controls are loading",
          body:
            "The interactive XR session is active. Material and Procedure controls will appear here as soon as the Player interaction state is ready.",
          progress: "Mobile AR",
          status: "Viqubed UI is active in the browser.",
          buttons: [{ label: "EXIT", action: "xr_exit" }],
        }
      : null);

  useEffect(() => {
    const element = overlayRef.current;
    if (!element) return undefined;

    // WebXR DOM Overlay can otherwise turn a touch on this HTML UI into an XR
    // select event as well. Preventing beforexrselect keeps material navigation
    // from also placing/selecting something in the AR scene behind the panel.
    const preventXRSelect = (event) => event.preventDefault();
    element.addEventListener("beforexrselect", preventXRSelect);
    return () => element.removeEventListener("beforexrselect", preventXRSelect);
  }, []);

  if (!viewModel) return null;

  const buttons = Array.isArray(viewModel.buttons)
    ? viewModel.buttons.filter(Boolean)
    : [];

  return (
    <div
      ref={overlayRef}
      className="pointer-events-none absolute inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[9999] flex justify-center px-3 sm:bottom-5 sm:px-5"
    >
      <section className="pointer-events-auto w-full max-w-xl rounded-2xl border border-secondary-default/40 bg-primary/88 p-3 shadow-2xl backdrop-blur-xl sm:p-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary-default">
          {viewModel.eyebrow || "VIQUBED XR"}
        </div>

        <h2 className="mt-1 line-clamp-2 text-base font-semibold text-white sm:text-lg">
          {viewModel.title || "XR Player"}
        </h2>

        {viewModel.body && (
          <p className="mt-2 max-h-24 overflow-y-auto whitespace-pre-line text-xs leading-5 text-white/80 sm:text-sm">
            {viewModel.body}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/55 sm:text-xs">
          {viewModel.progress && <span>{viewModel.progress}</span>}
          {viewModel.status && <span>{viewModel.status}</span>}
        </div>

        {buttons.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
            {buttons.map((button, index) => {
              const disabled = Boolean(button.disabled || !button.action);
              return (
                <button
                  key={`${button.action || button.label || "xr"}-${index}`}
                  type="button"
                  disabled={disabled}
                  aria-pressed={Boolean(button.active)}
                  onClick={() => {
                    if (button.action === "xr_exit" && !interaction?.onAction) {
                      xr?.exit?.();
                      return;
                    }
                    interaction?.onAction?.(button.action);
                  }}
                  className={`min-h-9 touch-manipulation rounded-lg border px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide transition sm:text-xs ${
                    button.active
                      ? "border-secondary-default bg-accent-main text-white"
                      : "border-white/15 bg-white/5 text-white/85"
                  } disabled:cursor-not-allowed disabled:opacity-35`}
                >
                  {button.label}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
