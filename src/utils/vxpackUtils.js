let jsZipPromise = null;
let fileSaverPromise = null;

async function loadJSZip() {
  if (!jsZipPromise) {
    jsZipPromise = import("jszip").then((module) => module.default || module);
  }

  return jsZipPromise;
}

async function loadSaveAs() {
  if (!fileSaverPromise) {
    fileSaverPromise = import("file-saver").then((module) => {
      const saveAs = module.saveAs || module.default?.saveAs || module.default;

      if (typeof saveAs !== "function") {
        throw new Error("FileSaver module tidak menyediakan fungsi saveAs");
      }

      return saveAs;
    });
  }

  return fileSaverPromise;
}

const VXPACK_VERSION = 2;
const VIQDATA_VERSION = 1;

const createSafeFileName = (name = "vx-package") => {
  const safeName = String(name || "vx-package")
    .trim()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return safeName || "vx-package";
};

const sanitizeAssetFileName = (name = "model.glb") => {
  return String(name || "model.glb")
    .replaceAll("\\", "/")
    .split("/")
    .pop()
    .replace(/[^\w.\-() ]+/g, "_");
};

const getPathFileName = (path = "models/model.glb") => {
  return sanitizeAssetFileName(path) || "model.glb";
};

const createPortableProjectMetadata = (project, material) => ({
  name:
    project?.name ||
    material?.projectName ||
    material?.title ||
    "Imported Viqubed Project",
  role: project?.role === "PLAYER" ? "PLAYER" : "EDITOR",
  workspace: project?.workspace || "Default Workspace",
  thumbnail: material?.thumbnail || project?.thumbnail || null,
  status: project?.status || "DRAFT",
  publishVersion: project?.publishVersion || null,
  metadata: project?.metadata || null,
  autosave: project?.autosave || null,
});

const normalizeMaterialForPackage = (material, modelPath) => ({
  ...(material || {}),
  modelUrl: modelPath,
  chapters: Array.isArray(material?.chapters) ? material.chapters : [],
  flows: Array.isArray(material?.flows) ? material.flows : [],
  procedures: Array.isArray(material?.procedures) ? material.procedures : [],
  objectNameOverrides: Array.isArray(material?.objectNameOverrides)
    ? material.objectNameOverrides
    : [],
});

const normalizeMaterialForDataPackage = (material) => {
  const normalizedMaterial = normalizeMaterialForPackage(material, null);

  // Data-only packages deliberately do not keep a runtime/blob model URL.
  // Object references (UUID/name/path/stable ids) remain inside the content
  // so they can be remapped when the data is applied to a replacement GLB.
  delete normalizedMaterial.originalModelUrl;
  delete normalizedMaterial.modelFile;
  delete normalizedMaterial.modelBlob;

  return normalizedMaterial;
};

const createNormalizedViewerSettings = ({
  viewerSettings,
  shaderMode,
  metalness,
  roughness,
}) => ({
  ...(viewerSettings || {}),
  shaderMode,
  metalness,
  roughness,
});

const createSourceModelMetadata = ({ modelFile, modelFileName, material }) => ({
  included: false,
  name: sanitizeAssetFileName(
    modelFile?.name || modelFileName || material?.modelUrl || "model.glb",
  ),
  type: modelFile?.type || "model/gltf-binary",
  size: Number(modelFile?.size || 0),
});

const createModelFile = (blob, fileName, mimeType) => {
  const normalizedType =
    mimeType || blob?.type || "model/gltf-binary";

  if (typeof File === "function") {
    return new File([blob], fileName, {
      type: normalizedType,
      lastModified: Date.now(),
    });
  }

  blob.name = fileName;
  blob.lastModified = Date.now();
  return blob;
};

// Shared by exportVXPack (plain) and exportEncryptedVXPack (AES-GCM wrapped)
// — builds the exact same zip either way; encryption is a wrapper applied to
// this function's output, not a separate package format.
async function buildVXPackZipBlob({
  project,
  material,
  modelFile,
  modelFileName,
  viewerSettings,
  scene,
  shaderMode,
  metalness,
  roughness,
  onProgress,
}) {
  if (!material) {
    throw new Error("Material belum tersedia");
  }

  if (!modelFile) {
    throw new Error("Load model GLB terlebih dahulu");
  }

  onProgress?.(0);

  const JSZip = await loadJSZip();
  const zip = new JSZip();
  const resolvedModelFileName = sanitizeAssetFileName(
    modelFile?.name || modelFileName || material?.modelUrl || "model.glb",
  );
  const modelPath = `models/${resolvedModelFileName}`;

  onProgress?.(5);
  zip.file(modelPath, modelFile);
  onProgress?.(20);

  const normalizedViewer = createNormalizedViewerSettings({
    viewerSettings,
    shaderMode,
    metalness,
    roughness,
  });
  const normalizedMaterial = normalizeMaterialForPackage(material, modelPath);

  const manifest = {
    packageType: "vxpack",
    packageVersion: VXPACK_VERSION,
    exportedAt: new Date().toISOString(),
    project: createPortableProjectMetadata(project, normalizedMaterial),
    model: {
      uri: modelPath,
      name: resolvedModelFileName,
      type: modelFile?.type || "model/gltf-binary",
      size: Number(modelFile?.size || 0),
    },
    material: normalizedMaterial,
    viewer: normalizedViewer,
    scene: scene || {},
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  onProgress?.(25);

  const blob = await zip.generateAsync(
    {
      type: "blob",
      compression: "STORE",
    },
    (metadata) => {
      const zipPercent = metadata.percent || 0;
      const totalPercent = 25 + Math.round((zipPercent / 100) * 70);

      onProgress?.(Math.min(totalPercent, 95));
    },
  );

  onProgress?.(98);

  const packageFileName = createSafeFileName(
    project?.name || material?.projectName || material?.title || modelFileName,
  );

  return { blob, manifest, packageFileName };
}

export const exportVXPack = async ({
  project,
  material,
  modelFile,
  modelFileName,
  viewerSettings,
  scene,
  shaderMode,
  metalness,
  roughness,
  onProgress,
}) => {
  const [saveAs, { blob, manifest, packageFileName }] = await Promise.all([
    loadSaveAs(),
    buildVXPackZipBlob({
      project,
      material,
      modelFile,
      modelFileName,
      viewerSettings,
      scene,
      shaderMode,
      metalness,
      roughness,
      onProgress,
    }),
  ]);

  saveAs(blob, `${packageFileName}.vxpack`);
  onProgress?.(100);

  return {
    blob,
    manifest,
  };
};

// AES-256-GCM encrypted variant of exportVXPack: builds the identical zip,
// then wraps it via cryptoUtils before saving as .vxenc instead of .vxpack.
// importEncryptedVXPack below decrypts back to that same zip and hands it to
// the regular importVXPack parser unchanged.
export const exportEncryptedVXPack = async ({
  project,
  material,
  modelFile,
  modelFileName,
  viewerSettings,
  scene,
  shaderMode,
  metalness,
  roughness,
  password,
  onProgress,
}) => {
  if (!password) {
    throw new Error("A password is required to encrypt this package.");
  }

  const [saveAs, { encryptBlobWithPassword }, { blob, manifest, packageFileName }] =
    await Promise.all([
      loadSaveAs(),
      import("./cryptoUtils"),
      buildVXPackZipBlob({
        project,
        material,
        modelFile,
        modelFileName,
        viewerSettings,
        scene,
        shaderMode,
        metalness,
        roughness,
        onProgress: (percent) => {
          onProgress?.(Math.min(Math.round((percent / 100) * 90), 90));
        },
      }),
    ]);

  onProgress?.(92);

  const encryptedBlob = await encryptBlobWithPassword(blob, password);

  onProgress?.(98);

  saveAs(encryptedBlob, `${packageFileName}.vxenc`);
  onProgress?.(100);

  return {
    blob: encryptedBlob,
    manifest,
  };
};

export const exportViqubedDataOnly = async ({
  project,
  material,
  modelFile,
  modelFileName,
  viewerSettings,
  scene,
  shaderMode,
  metalness,
  roughness,
  onProgress,
}) => {
  if (!material) {
    throw new Error("Material belum tersedia");
  }

  onProgress?.(0);

  const [JSZip, saveAs] = await Promise.all([loadJSZip(), loadSaveAs()]);
  const zip = new JSZip();

  onProgress?.(12);

  const normalizedViewer = createNormalizedViewerSettings({
    viewerSettings,
    shaderMode,
    metalness,
    roughness,
  });
  const normalizedMaterial = normalizeMaterialForDataPackage(material);
  const sourceModel = createSourceModelMetadata({
    modelFile,
    modelFileName,
    material,
  });

  const manifest = {
    packageType: "viqubed-data",
    packageVersion: VIQDATA_VERSION,
    exportedAt: new Date().toISOString(),
    containsModel: false,
    project: createPortableProjectMetadata(project, normalizedMaterial),
    sourceModel,
    material: normalizedMaterial,
    viewer: normalizedViewer,
    scene: scene || {},
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  onProgress?.(30);

  const blob = await zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
    },
    (metadata) => {
      const zipPercent = metadata.percent || 0;
      const totalPercent = 30 + Math.round((zipPercent / 100) * 65);

      onProgress?.(Math.min(totalPercent, 95));
    },
  );

  onProgress?.(98);

  const packageFileName = createSafeFileName(
    project?.name || material?.projectName || material?.title || modelFileName,
  );

  saveAs(blob, `${packageFileName}_data.viqdata`);
  onProgress?.(100);

  return {
    blob,
    manifest,
  };
};

export const importViqubedDataOnly = async (file) => {
  if (!file) {
    throw new Error("File data VIQUBED tidak ditemukan");
  }

  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file("manifest.json");

  if (!manifestFile) {
    throw new Error("manifest.json tidak ditemukan");
  }

  const manifestText = await manifestFile.async("text");
  const rawManifest = JSON.parse(manifestText);

  if (
    rawManifest?.packageType !== "viqubed-data" ||
    rawManifest?.containsModel !== false
  ) {
    throw new Error("File bukan package data VIQUBED yang valid");
  }

  return {
    rawManifest,
    project: rawManifest?.project || {},
    material: rawManifest?.material || {},
    viewer: rawManifest?.viewer || {},
    scene: rawManifest?.scene || {},
    sourceModel: rawManifest?.sourceModel || null,
  };
};

export const isViqubedDataFile = (file) => {
  return file?.name?.toLowerCase().endsWith(".viqdata");
};

export const importVXPack = async (file, { createObjectUrl = true } = {}) => {
  if (!file) {
    throw new Error("File VXPACK tidak ditemukan");
  }

  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file("manifest.json");

  if (!manifestFile) {
    throw new Error("manifest.json tidak ditemukan");
  }

  const manifestText = await manifestFile.async("text");
  const rawManifest = JSON.parse(manifestText);
  const isVersionTwo =
    Number(rawManifest?.packageVersion) >= 2 && rawManifest?.material;

  const legacyMaterial = { ...(rawManifest || {}) };
  const legacyProject = legacyMaterial.project || {};
  const legacyViewerSettings = legacyMaterial.viewerSettings || {};
  const legacyScene = legacyMaterial.scene || {};

  delete legacyMaterial.packageType;
  delete legacyMaterial.packageVersion;
  delete legacyMaterial.exportedAt;
  delete legacyMaterial.viewerSettings;
  delete legacyMaterial.scene;
  delete legacyMaterial.project;
  delete legacyMaterial.model;

  const packageProject = isVersionTwo
    ? rawManifest.project || {}
    : legacyProject;
  const packageMaterial = isVersionTwo
    ? rawManifest.material || {}
    : legacyMaterial;
  const packageViewer = isVersionTwo
    ? rawManifest.viewer || {}
    : legacyViewerSettings;
  const packageScene = isVersionTwo
    ? rawManifest.scene || {}
    : legacyScene;
  const modelPath =
    rawManifest?.model?.uri ||
    packageMaterial?.modelUrl ||
    rawManifest?.modelUrl;

  if (!modelPath) {
    throw new Error("Lokasi model GLB tidak ditemukan pada manifest");
  }

  const modelEntry = zip.file(modelPath);

  if (!modelEntry) {
    throw new Error(`Model ${modelPath} tidak ditemukan`);
  }

  const modelBlob = await modelEntry.async("blob");
  const modelFileName =
    rawManifest?.model?.name || getPathFileName(modelPath);
  const modelFile = createModelFile(
    modelBlob,
    modelFileName,
    rawManifest?.model?.type,
  );
  const modelUrl = createObjectUrl ? URL.createObjectURL(modelFile) : null;

  const runtimeMaterial = {
    ...packageMaterial,
    modelUrl: modelUrl || modelPath,
    originalModelUrl: modelPath,
    viewerSettings: packageViewer,
    scene: packageScene,
    packageProject,
    packageType: rawManifest?.packageType || "vxpack",
    packageVersion: Number(rawManifest?.packageVersion || 1),
  };

  return {
    manifest: runtimeMaterial,
    rawManifest,
    project: packageProject,
    material: packageMaterial,
    viewer: packageViewer,
    scene: packageScene,
    modelFile,
    modelUrl,
    modelPath,
  };
};

export const isVXPackFile = (file) => {
  return file?.name?.toLowerCase().endsWith(".vxpack");
};

// Decrypts a .vxenc file back into the plain .vxpack zip bytes it was built
// from, then reuses importVXPack unchanged — JSZip.loadAsync and everything
// downstream of it only need a Blob/File, never the original filename.
export const importEncryptedVXPack = async (
  file,
  password,
  { createObjectUrl = true } = {},
) => {
  if (!file) {
    throw new Error("File paket terenkripsi tidak ditemukan");
  }

  if (!password) {
    throw new Error("A password is required to open this package.");
  }

  const { decryptBlobWithPassword } = await import("./cryptoUtils");
  const decryptedBlob = await decryptBlobWithPassword(file, password);

  return importVXPack(decryptedBlob, { createObjectUrl });
};
