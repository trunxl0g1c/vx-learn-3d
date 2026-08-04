// Shared by projectSync.js (push) and projectHydrate.js (pull) — thumbnail-
// specific helpers (hash/File/data-URL conversions for material.thumbnail),
// plus dataUrlToNamedFile below, reused for project/chapter gallery media
// too since it's the same base64-data-URL-to-File conversion either way.

// Cheap, non-cryptographic (FNV-1a).
export function hashThumbnail(dataUrl) {
  if (!dataUrl) return null;

  let hash = 0x811c9dc5;

  for (let i = 0; i < dataUrl.length; i += 1) {
    hash ^= dataUrl.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16);
}

// material.thumbnail is always a base64 data URL locally (see
// ProjectSettingsPanel's viewport-capture/upload flow) — this turns one back
// into a File for POSTing to /content-media.
export function dataUrlToFile(dataUrl, baseName) {
  const [meta, base64] = dataUrl.split(",");
  const mimetype = /data:([^;]+);base64/.exec(meta)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const ext = mimetype.split("/")[1]?.split("+")[0] || "jpg";

  return new File([bytes], `${baseName}.${ext}`, { type: mimetype });
}

// Same conversion as dataUrlToFile, but for gallery media (project-level
// material.media / chapter.media) where the original filename and mimetype
// are already known locally, rather than guessed from the data URL.
export function dataUrlToNamedFile(dataUrl, filename, mimetype) {
  const [meta, base64] = dataUrl.split(",");
  const resolvedMimetype =
    mimetype || /data:([^;]+);base64/.exec(meta)?.[1] || "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new File([bytes], filename || "file", { type: resolvedMimetype });
}

// Reverse direction, for hydrate: a fetched thumbnail blob back into the
// same base64 data URL shape material.thumbnail expects locally.
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
