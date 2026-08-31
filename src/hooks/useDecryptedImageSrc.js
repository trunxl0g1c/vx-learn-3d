import { useEffect, useState } from "react";
import { decryptToBlob } from "../lib/responseEncryption";

function isLocalUrl(url) {
  return url.startsWith("blob:") || url.startsWith("data:");
}

/**
 * Thumbnail URLs (getWorkspaceThumbnailUrl/getContentThumbnailUrl) are
 * plain backend URLs meant to be dropped straight into <img src>, fetched
 * natively by the browser — no apiClient/axios involved, so the response
 * encryption interceptor never sees them. This hook does the fetch+decrypt
 * by hand instead, returning a local blob: object URL once ready.
 *
 * No fetch happens at all for an already-local object/data URL (e.g. a
 * file-picker preview before upload) — that value is returned directly,
 * synchronously, from render rather than via state+effect.
 */
export function useDecryptedImageSrc(url) {
  const [decryptedUrl, setDecryptedUrl] = useState(null);
  const needsFetch = Boolean(url) && !isLocalUrl(url);

  useEffect(() => {
    if (!needsFetch) return undefined;

    let cancelled = false;
    let localUrl = null;

    (async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Thumbnail fetch failed: ${res.status}`);

      const cipherBlob = await res.blob();
      const plainBlob = await decryptToBlob(
        cipherBlob,
        res.headers.get("x-plaintext-content-type"),
      );

      if (cancelled) return;
      localUrl = URL.createObjectURL(plainBlob);
      setDecryptedUrl(localUrl);
    })().catch((error) => {
      console.error("Failed to load encrypted thumbnail:", error);
    });

    return () => {
      cancelled = true;
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [url, needsFetch]);

  if (!url) return null;
  if (isLocalUrl(url)) return url;
  return decryptedUrl;
}
