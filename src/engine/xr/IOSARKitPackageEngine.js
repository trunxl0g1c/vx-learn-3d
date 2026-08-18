import { createUSDZExportEngine } from "./USDZExportEngine";

const PACKAGE_TYPE = "viqubed-arkit";
const PACKAGE_VERSION = 1;
const PACKAGE_EXTENSION = ".viqar";
const PACKAGE_MIME = "application/vnd.viqubed.arkit+zip";

let jsZipPromise = null;

async function loadJSZip() {
  if (!jsZipPromise) {
    jsZipPromise = import("jszip").then((module) => module.default || module);
  }
  return jsZipPromise;
}

function safeName(value, fallback = "viqubed-project") {
  const normalized = String(value || fallback)
    .trim()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "");
  return normalized || fallback;
}

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}


function createSceneObjectMap(scene) {
  const entries = [];

  const visit = (object, path = []) => {
    if (!object) return;
    entries.push({
      uuid: object.uuid || null,
      name: object.name || "",
      type: object.type || "Object3D",
      path,
      parentUuid: object.parent?.uuid || null,
      visible: object.visible !== false,
      isMesh: Boolean(object.isMesh),
    });

    const children = Array.isArray(object.children) ? object.children : [];
    children.forEach((child, index) => visit(child, [...path, index]));
  };

  const roots = Array.isArray(scene?.children) ? scene.children : [];
  roots.forEach((child, index) => visit(child, [index]));
  return entries;
}

function createFile(blob, fileName) {
  if (typeof File === "function") {
    return new File([blob], fileName, {
      type: PACKAGE_MIME,
      lastModified: Date.now(),
    });
  }
  blob.name = fileName;
  return blob;
}

export function createIOSARKitPackageEngine() {
  const usdzEngine = createUSDZExportEngine();
  let preparedFile = null;
  let preparedManifest = null;
  let preparedScene = null;
  let preparePromise = null;
  let generation = 0;

  const clearPrepared = () => {
    generation += 1;
    preparedFile = null;
    preparedManifest = null;
    preparedScene = null;
    preparePromise = null;
  };

  return {
    getState() {
      return {
        ready: Boolean(preparedFile),
        file: preparedFile,
        manifest: preparedManifest,
      };
    },

    async prepare({ scene, modelFileName, project, material, viewer, runtime }) {
      if (!scene) throw new Error("3D model is not ready for native iOS AR.");
      if (!material) throw new Error("Viqubed material data is not ready.");

      if (preparedScene === scene && preparedFile) {
        return { file: preparedFile, manifest: preparedManifest };
      }
      if (preparedScene === scene && preparePromise) return preparePromise;

      clearPrepared();
      preparedScene = scene;
      const prepareGeneration = generation;

      preparePromise = (async () => {
        const [JSZip, usdz] = await Promise.all([
          loadJSZip(),
          usdzEngine.export(scene, {
            fileName: modelFileName || "viqubed-model.glb",
            quickLookCompatible: true,
            includeAnchoringProperties: true,
            anchoring: "plane",
            planeAlignment: "horizontal",
            onlyVisible: false,
          }),
        ]);

        if (prepareGeneration !== generation || preparedScene !== scene) {
          throw new Error("Project changed while preparing native iOS AR package.");
        }

        const zip = new JSZip();
        const modelPath = `models/${usdz.fileName}`;
        const manifest = {
          packageType: PACKAGE_TYPE,
          packageVersion: PACKAGE_VERSION,
          exportedAt: new Date().toISOString(),
          platform: "ios-arkit-realitykit",
          model: {
            uri: modelPath,
            name: usdz.fileName,
            type: usdz.blob.type || "model/vnd.usdz+zip",
            size: Number(usdz.blob.size || 0),
            anchoring: {
              type: "plane",
              alignment: "horizontal",
            },
          },
          project: jsonSafe(project || {}),
          material: jsonSafe(material),
          viewer: jsonSafe(viewer || {}),
          runtime: jsonSafe({
            ...(runtime || {}),
            objectMap: createSceneObjectMap(scene),
            contractVersion: 1,
            renderer: "realitykit",
            tracking: "arkit-world-tracking",
          }),
        };

        zip.file(modelPath, usdz.blob);
        zip.file("manifest.json", JSON.stringify(manifest, null, 2));

        const packageBlob = await zip.generateAsync({
          type: "blob",
          compression: "STORE",
        });
        const packageName = `${safeName(
          project?.name || material?.projectName || material?.title,
        )}${PACKAGE_EXTENSION}`;

        preparedFile = createFile(packageBlob, packageName);
        preparedManifest = manifest;
        return { file: preparedFile, manifest: preparedManifest };
      })();

      try {
        return await preparePromise;
      } catch (error) {
        if (prepareGeneration === generation) {
          preparedFile = null;
          preparedManifest = null;
        }
        throw error;
      } finally {
        if (prepareGeneration === generation) preparePromise = null;
      }
    },

    dispose() {
      clearPrepared();
      usdzEngine.dispose();
    },
  };
}

export default createIOSARKitPackageEngine;
