import { supportsAppleARQuickLook } from "./XRPlatform";
import { createUSDZExportEngine } from "./USDZExportEngine";

function createQuickLookAnchor(url) {
  const anchor = document.createElement("a");
  anchor.rel = "ar";
  anchor.href = url;
  anchor.style.position = "fixed";
  anchor.style.left = "-10000px";
  anchor.style.width = "1px";
  anchor.style.height = "1px";
  anchor.setAttribute("aria-hidden", "true");

  const image = document.createElement("img");
  image.alt = "";
  image.width = 1;
  image.height = 1;
  anchor.appendChild(image);
  return anchor;
}

export function createXRQuickLookEngine() {
  const usdzEngine = createUSDZExportEngine();
  let preparedScene = null;
  let preparedUrl = "";
  let preparedFileName = "";
  let preparePromise = null;
  let prepareGeneration = 0;

  const revokePreparedUrl = () => {
    if (preparedUrl && typeof URL !== "undefined") {
      URL.revokeObjectURL(preparedUrl);
    }
    preparedUrl = "";
    preparedFileName = "";
    preparedScene = null;
  };

  return {
    isAvailable() {
      return supportsAppleARQuickLook();
    },

    getState() {
      return {
        ready: Boolean(preparedUrl),
        fileName: preparedFileName,
        scene: preparedScene,
      };
    },

    async prepare(scene, { fileName, maxTextureSize = 1024 } = {}) {
      if (!scene) throw new Error("3D model is not ready for iPhone AR.");
      if (!this.isAvailable()) {
        throw new Error("Apple AR Quick Look is not available on this device.");
      }
      if (preparedScene === scene && preparedUrl) return preparedUrl;
      if (preparedScene === scene && preparePromise) return preparePromise;

      revokePreparedUrl();
      preparedScene = scene;
      const generation = ++prepareGeneration;

      preparePromise = (async () => {
        const { blob, fileName: usdzFileName } = await usdzEngine.export(scene, {
          fileName,
          maxTextureSize,
          quickLookCompatible: true,
          includeAnchoringProperties: true,
          onlyVisible: true,
          anchoring: "plane",
          planeAlignment: "horizontal",
        });

        if (preparedScene !== scene || generation !== prepareGeneration) {
          throw new Error("The model changed while preparing iPhone AR.");
        }

        preparedUrl = URL.createObjectURL(blob);
        preparedFileName = usdzFileName;
        return preparedUrl;
      })();

      try {
        return await preparePromise;
      } catch (error) {
        if (preparedScene === scene) revokePreparedUrl();
        throw error;
      } finally {
        if (generation === prepareGeneration) preparePromise = null;
      }
    },

    open() {
      if (!preparedUrl || typeof document === "undefined") return false;
      const anchor = createQuickLookAnchor(preparedUrl);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return true;
    },

    dispose() {
      prepareGeneration += 1;
      preparePromise = null;
      revokePreparedUrl();
      usdzEngine.dispose();
    },
  };
}

export default createXRQuickLookEngine;
