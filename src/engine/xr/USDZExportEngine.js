const USDZ_MIME = "model/vnd.usdz+zip";

async function exportSceneToUSDZ(exporter, scene, options) {
  if (typeof exporter.parseAsync === "function") {
    return exporter.parseAsync(scene, options);
  }

  return new Promise((resolve, reject) => {
    exporter.parse(scene, resolve, reject, options);
  });
}

export function normalizeUSDZFileName(fileName) {
  const raw = String(fileName || "viqubed-model")
    .replace(/\.(glb|gltf|usdz)$/i, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `${raw || "viqubed-model"}.usdz`;
}

export function createUSDZExportEngine() {
  let activeScene = null;
  let activePromise = null;
  let cachedBlob = null;
  let cachedFileName = "";
  let generation = 0;

  const reset = () => {
    generation += 1;
    activeScene = null;
    activePromise = null;
    cachedBlob = null;
    cachedFileName = "";
  };

  return {
    getState() {
      return {
        ready: Boolean(cachedBlob),
        scene: activeScene,
        fileName: cachedFileName,
        blob: cachedBlob,
      };
    },

    async export(
      scene,
      {
        fileName,
        maxTextureSize = 1024,
        quickLookCompatible = true,
        includeAnchoringProperties = true,
        onlyVisible = true,
        anchoring = "plane",
        planeAlignment = "horizontal",
      } = {},
    ) {
      if (!scene) throw new Error("3D model is not ready for USDZ export.");

      const normalizedFileName = normalizeUSDZFileName(fileName);
      if (
        activeScene === scene &&
        cachedBlob &&
        cachedFileName === normalizedFileName
      ) {
        return { blob: cachedBlob, fileName: cachedFileName };
      }
      if (activeScene === scene && activePromise) return activePromise;

      activeScene = scene;
      cachedBlob = null;
      cachedFileName = normalizedFileName;
      const exportGeneration = ++generation;

      activePromise = (async () => {
        const { USDZExporter } = await import(
          "three/examples/jsm/exporters/USDZExporter.js"
        );
        const exporter = new USDZExporter();
        const result = await exportSceneToUSDZ(exporter, scene, {
          quickLookCompatible,
          includeAnchoringProperties,
          onlyVisible,
          maxTextureSize,
          ar: {
            anchoring: { type: anchoring },
            planeAnchoring: { alignment: planeAlignment },
          },
        });

        if (activeScene !== scene || exportGeneration !== generation) {
          throw new Error("The model changed while exporting USDZ.");
        }

        cachedBlob = new Blob([result], { type: USDZ_MIME });
        return { blob: cachedBlob, fileName: cachedFileName };
      })();

      try {
        return await activePromise;
      } catch (error) {
        if (exportGeneration === generation) {
          cachedBlob = null;
        }
        throw error;
      } finally {
        if (exportGeneration === generation) activePromise = null;
      }
    },

    dispose() {
      reset();
    },
  };
}

export default createUSDZExportEngine;
