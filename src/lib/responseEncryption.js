// Decrypts backend response bodies encrypted by
// src/common/response-encryption.util.ts — AES-256-GCM, key derived via
// PBKDF2-SHA256 (250,000 iterations, same as this app's own cryptoUtils.js)
// from a shared secret baked into the build. This hides the payload from
// anyone reading raw bytes (DevTools Network tab, a proxy, a packet
// capture) — not from someone reading this shipped bundle, which is where
// the key necessarily lives too. See the backend util's doc comment.
//
// SALT and ITERATIONS must match response-encryption.util.ts exactly.
const SALT = new TextEncoder().encode("vxcubed-response-encryption-v1");
const ITERATIONS = 250000;
const RAW_KEY = import.meta.env.VITE_RESPONSE_ENCRYPTION_KEY;

let cachedKeyPromise;

function getKey() {
  if (!RAW_KEY) return Promise.resolve(null);
  cachedKeyPromise ??= deriveKeyOnce();
  return cachedKeyPromise;
}

async function deriveKeyOnce() {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(RAW_KEY),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: SALT, iterations: ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function isEnvelope(value) {
  return (
    value != null &&
    typeof value === "object" &&
    typeof value.iv === "string" &&
    typeof value.authTag === "string" &&
    typeof value.ciphertext === "string"
  );
}

// Node keeps ciphertext and the GCM auth tag as two separate values
// (cipher.getAuthTag()); Web Crypto's AES-GCM decrypt wants them
// concatenated into one buffer, tag appended at the end — miss this and
// subtle.decrypt fails with an opaque OperationError.
async function decryptEnvelope(envelope) {
  const key = await getKey();
  if (!key) return null;

  const ciphertext = base64ToBytes(envelope.ciphertext);
  const authTag = base64ToBytes(envelope.authTag);
  const combined = new Uint8Array(ciphertext.length + authTag.length);
  combined.set(ciphertext, 0);
  combined.set(authTag, ciphertext.length);

  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(envelope.iv) },
    key,
    combined,
  );
}

/** Used for the JSON response path — defensive passthrough when the body isn't an envelope (encryption disabled server-side). */
export async function decryptJsonEnvelope(data) {
  if (!isEnvelope(data)) return data;

  const plainBuffer = await decryptEnvelope(data);
  if (!plainBuffer) {
    console.error(
      "Received an encrypted response but VITE_RESPONSE_ENCRYPTION_KEY is not configured — returning ciphertext as-is.",
    );
    return data;
  }

  return JSON.parse(new TextDecoder().decode(plainBuffer));
}

/** Used for the `responseType: "blob"` path (GLB models, chapter/slide media). */
export async function decryptToBlob(cipherBlob, plaintextMimeType) {
  let envelope;
  try {
    envelope = JSON.parse(await cipherBlob.text());
  } catch {
    return cipherBlob; // not JSON — already plaintext
  }

  if (!isEnvelope(envelope)) return cipherBlob;

  const plainBuffer = await decryptEnvelope(envelope);
  if (!plainBuffer) {
    console.error(
      "Received an encrypted response but VITE_RESPONSE_ENCRYPTION_KEY is not configured — returning ciphertext as-is.",
    );
    return cipherBlob;
  }

  return new Blob([plainBuffer], {
    type: plaintextMimeType || cipherBlob.type,
  });
}
