import { detectXRPlatform } from "./XRPlatform";
import { createIOSARKitPackageEngine } from "./IOSARKitPackageEngine";

function downloadFile(file) {
  if (!file || typeof document === "undefined") return false;
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name || "viqubed-project.viqar";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function createIOSARKitBridgeEngine() {
  const packageEngine = createIOSARKitPackageEngine();

  return {
    isAvailable() {
      const platform = detectXRPlatform();
      return platform.isIOS && platform.isSecureContext;
    },

    getState() {
      return packageEngine.getState();
    },

    prepare(payload) {
      return packageEngine.prepare(payload);
    },

    async handoff({ title = "Open in Viqubed AR", text = "Viqubed native AR project" } = {}) {
      const { file } = packageEngine.getState();
      if (!file) throw new Error("Native iOS AR package has not been prepared.");

      let canShareFiles = false;
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          canShareFiles =
            typeof navigator.canShare !== "function" ||
            navigator.canShare({ files: [file] });
        } catch {
          canShareFiles = false;
        }
      }

      if (canShareFiles) {
        await navigator.share({ title, text, files: [file] });
        return { method: "share", file };
      }

      if (downloadFile(file)) {
        return { method: "download", file };
      }

      throw new Error("This browser cannot hand off the native iOS AR package.");
    },

    dispose() {
      packageEngine.dispose();
    },
  };
}

export default createIOSARKitBridgeEngine;
