import JSZip from "jszip"

const safeFileName = (name = "file") => {
  return String(name)
    .replaceAll("\\", "/")
    .split("/")
    .pop()
    .replace(/[^\w.\-() ]+/g, "_")
}

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")

  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()

  URL.revokeObjectURL(url)
}

export const exportVXPack = async ({
  material,
  modelFile,
  viewerSettings,
  shaderMode,
  metalness,
  roughness,
}) => {
  if (!material) {
    throw new Error("Material belum tersedia")
  }

  if (!modelFile) {
    throw new Error("Load model GLB terlebih dahulu")
  }

  const zip = new JSZip()

  const modelFileName = safeFileName(modelFile.name || "model.glb")
  const modelPath = `model/${modelFileName}`

  zip.file(modelPath, modelFile)

  const manifest = {
    ...material,
    modelUrl: modelPath,
    packageType: "vxpack",
    packageVersion: 1,
    exportedAt: new Date().toISOString(),
    viewerSettings: {
      ...(viewerSettings || {}),
      shaderMode,
      metalness,
      roughness,
    },
  }

  zip.file("manifest.json", JSON.stringify(manifest, null, 2))

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: {
      level: 6,
    },
  })

  downloadBlob(blob, `${safeFileName(material.title || "materi-3d")}.vxpack`)
}

export const importVXPack = async (file) => {
  if (!file) {
    throw new Error("File VXPACK tidak ditemukan")
  }

  const zip = await JSZip.loadAsync(file)
  const manifestFile = zip.file("manifest.json")

  if (!manifestFile) {
    throw new Error("manifest.json tidak ditemukan")
  }

  const manifestText = await manifestFile.async("text")
  const manifest = JSON.parse(manifestText)

  const modelEntry = zip.file(manifest.modelUrl)

  if (!modelEntry) {
    throw new Error(`Model ${manifest.modelUrl} tidak ditemukan`)
  }

  const modelBlob = await modelEntry.async("blob")
  const modelUrl = URL.createObjectURL(modelBlob)

  return {
    manifest: {
      ...manifest,
      modelUrl,
      originalModelUrl: manifest.modelUrl,
    },
  }
}

export const isVXPackFile = (file) => {
  return file?.name?.toLowerCase().endsWith(".vxpack")
}