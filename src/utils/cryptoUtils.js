// AES-256-GCM (Web Crypto) with a PBKDF2-SHA256 password-derived key.
// No key/password is ever stored anywhere — losing the password makes the
// encrypted blob permanently unreadable, by design.
const MAGIC_BYTES = new Uint8Array([0x56, 0x58, 0x45, 0x4e, 0x43, 0x31]); // "VXENC1"
const VERSION = 1;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const DEFAULT_ITERATIONS = 250000;
const HEADER_LENGTH = MAGIC_BYTES.length + 1 + 4 + SALT_LENGTH + IV_LENGTH;

function writeUint32BE(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

function readUint32BE(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(
    0,
    false,
  );
}

async function deriveAesKey(password, salt, iterations) {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBlobWithPassword(
  blob,
  password,
  { iterations = DEFAULT_ITERATIONS } = {},
) {
  if (!blob) throw new Error("Nothing to encrypt.");
  if (!password) throw new Error("A password is required to encrypt this package.");

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveAesKey(password, salt, iterations);
  const plainBuffer = await blob.arrayBuffer();
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plainBuffer,
  );

  const header = new Uint8Array(HEADER_LENGTH);
  header.set(MAGIC_BYTES, 0);
  header[MAGIC_BYTES.length] = VERSION;
  header.set(writeUint32BE(iterations), MAGIC_BYTES.length + 1);
  header.set(salt, MAGIC_BYTES.length + 1 + 4);
  header.set(iv, MAGIC_BYTES.length + 1 + 4 + SALT_LENGTH);

  return new Blob([header, cipherBuffer], { type: "application/octet-stream" });
}

export async function decryptBlobWithPassword(encryptedBlob, password) {
  if (!encryptedBlob) throw new Error("No encrypted package provided.");
  if (!password) throw new Error("A password is required to decrypt this package.");

  const headerBuffer = new Uint8Array(
    await encryptedBlob.slice(0, HEADER_LENGTH).arrayBuffer(),
  );

  if (headerBuffer.length < HEADER_LENGTH) {
    throw new Error("This file is not a valid encrypted VIQUBED package.");
  }

  for (let i = 0; i < MAGIC_BYTES.length; i += 1) {
    if (headerBuffer[i] !== MAGIC_BYTES[i]) {
      throw new Error("This file is not a valid encrypted VIQUBED package.");
    }
  }

  const iterations = readUint32BE(headerBuffer, MAGIC_BYTES.length + 1);
  const salt = headerBuffer.slice(
    MAGIC_BYTES.length + 1 + 4,
    MAGIC_BYTES.length + 1 + 4 + SALT_LENGTH,
  );
  const iv = headerBuffer.slice(
    MAGIC_BYTES.length + 1 + 4 + SALT_LENGTH,
    HEADER_LENGTH,
  );
  const cipherBuffer = await encryptedBlob.slice(HEADER_LENGTH).arrayBuffer();
  const key = await deriveAesKey(password, salt, iterations);

  try {
    const plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipherBuffer,
    );

    return new Blob([plainBuffer]);
  } catch {
    throw new Error("Incorrect password or corrupted file.");
  }
}

export function isEncryptedPackageFile(file) {
  return Boolean(file?.name?.toLowerCase().endsWith(".vxenc"));
}
