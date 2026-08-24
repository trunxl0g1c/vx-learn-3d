import axios from "axios";
import apiClient from "../../../lib/apiClient";

// Mirrors the backend's UPLOAD_MIN_CHUNK_BYTES — every part except the last
// must be at least this large (an S3 multipart hard constraint, enforced by
// the API regardless of the active storage driver).
export const UPLOAD_MIN_CHUNK_BYTES = 5 * 1024 * 1024;

const STATUS_POLL_INTERVAL_MS = 1500;
const STATUS_POLL_TIMEOUT_MS = 5 * 60 * 1000;

export async function createUploadSessionRequest({
  contentId,
  filename,
  mimetype,
  mediaClassification,
  totalSize,
  chunkSize,
}) {
  const response = await apiClient.post("/uploads", {
    contentId,
    filename,
    mimetype,
    mediaClassification,
    totalSize,
    chunkSize,
  });

  return response.data?.data;
}

export async function presignUploadPartRequest({ id, partNumber }) {
  const response = await apiClient.post("/uploads/parts/presign", {
    id,
    partNumber,
  });

  return response.data?.data;
}

export async function completeUploadPartRequest({ id, partNumber, etag, size }) {
  const response = await apiClient.post("/uploads/parts/complete", {
    id,
    partNumber,
    etag,
    size,
  });

  return response.data?.data;
}

export async function finalizeUploadRequest({ id }) {
  const response = await apiClient.post("/uploads/finalize", { id });

  return response.data?.data;
}

export async function getUploadStatusRequest({ id }) {
  const response = await apiClient.get("/uploads/status", { params: { id } });

  return response.data?.data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollUploadStatus(id) {
  const deadline = Date.now() + STATUS_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const status = await getUploadStatusRequest({ id });

    if (status?.status === "COMPLETED") return status;

    if (status?.status === "FAILED" || status?.status === "EXPIRED") {
      throw new Error(
        status?.errorMessage ||
          `Upload ${status?.status?.toLowerCase() || "failed"}.`,
      );
    }

    await sleep(STATUS_POLL_INTERVAL_MS);
  }

  throw new Error("Timed out waiting for the upload to finish processing.");
}

/**
 * Chunked, presigned-direct-to-storage upload: create a session, then for
 * every part presign -> PUT the raw bytes straight to storage (S3/R2, or the
 * local driver's own stand-in endpoint) -> report the ETag read back off
 * that PUT -> once every part is reported, finalize and poll until the
 * server-side reassembly completes.
 *
 * The presigned-URL PUT deliberately bypasses `apiClient`: it targets a
 * foreign/self-signed URL that carries its own auth (the signature baked
 * into the URL), not this app's session cookies.
 */
export async function uploadFileInChunks({
  contentId,
  file,
  mediaClassification = "MODEL",
  onProgress,
}) {
  const chunkSize = UPLOAD_MIN_CHUNK_BYTES;
  const totalSize = file.size;

  const session = await createUploadSessionRequest({
    contentId,
    filename: file.name,
    mimetype: file.type || "application/octet-stream",
    mediaClassification,
    totalSize,
    chunkSize,
  });

  const totalChunks = session.totalChunks;

  for (let partNumber = 1; partNumber <= totalChunks; partNumber += 1) {
    const start = (partNumber - 1) * chunkSize;
    const end = Math.min(start + chunkSize, totalSize);
    const chunkBlob = file.slice(start, end);

    const presigned = await presignUploadPartRequest({
      id: session.id,
      partNumber,
    });

    const putResponse = await axios.put(presigned.url, chunkBlob, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
    });

    const etag = putResponse.headers?.etag;

    if (!etag) {
      throw new Error(
        `Part ${partNumber} uploaded, but no ETag came back in the response — the storage endpoint's CORS config likely needs to expose the ETag header (Access-Control-Expose-Headers) for the browser to read it.`,
      );
    }

    await completeUploadPartRequest({
      id: session.id,
      partNumber,
      etag,
      size: chunkBlob.size,
    });

    onProgress?.({
      uploadedBytes: end,
      totalBytes: totalSize,
      partNumber,
      totalChunks,
    });
  }

  await finalizeUploadRequest({ id: session.id });
  const finalStatus = await pollUploadStatus(session.id);

  return {
    uploadSessionId: session.id,
    mediaId: finalStatus.resultMediaId,
  };
}
