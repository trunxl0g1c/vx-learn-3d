// Character class built from an escaped string (rather than a regex
// literal) to avoid any editor/tooling normalization of the \uXXXX escapes
// for C0/C1 control points and zero-width characters.
const CONTROL_CHARS_PATTERN =
  "\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F-\\u009F\\u200B-\\u200D\\uFEFF";
const CONTROL_CHARS_REGEX = new RegExp(`[${CONTROL_CHARS_PATTERN}]`, "g");
const BLANK_LINE_RUN_REGEX = /\n{3,}/g;
const HORIZONTAL_WHITESPACE_RUN_REGEX = /[^\S\n]+/g;

// Mirrors the backend's src/common/validation.constants.ts exactly, so a
// name accepted client-side is never rejected server-side.
export const SAFE_LABEL_REGEX = /^[a-zA-Z0-9 \-_.,()&]+$/;
export const SAFE_LABEL_REGEX_MESSAGE =
  "Only letters, numbers, spaces, and - _ . , ( ) & are allowed";
export const SAFE_LABEL_MAX_LENGTH = 64;
const SAFE_LABEL_STRIP_REGEX = /[^a-zA-Z0-9 \-_.,()&]/g;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX_LENGTH = 254;

export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export const PASSWORD_REQUIREMENTS_TEXT =
  "At least 8 characters, including an uppercase letter, a lowercase letter, a number, and a symbol.";

/**
 * Strips control/zero-width characters always. collapseWhitespace also
 * trims and collapses runs of horizontal whitespace. allowNewlines
 * preserves single newlines (for textareas) while still collapsing
 * blank-line runs down to a single blank line.
 */
export function sanitizeText(
  raw,
  { maxLength, collapseWhitespace = true, allowNewlines = false } = {},
) {
  let value = (raw ?? "").toString().replace(CONTROL_CHARS_REGEX, "");

  if (!allowNewlines) {
    value = value.replace(/\r?\n/g, " ");
  } else {
    value = value.replace(/\r\n/g, "\n");
  }

  if (collapseWhitespace) {
    value = value.replace(HORIZONTAL_WHITESPACE_RUN_REGEX, " ");
    if (allowNewlines) {
      value = value.replace(BLANK_LINE_RUN_REGEX, "\n\n");
    }
    value = value.trim();
  }

  if (typeof maxLength === "number" && value.length > maxLength) {
    value = value.slice(0, maxLength);
  }

  return value;
}

/**
 * Live-strips characters outside SAFE_LABEL_REGEX's allowlist, for fields
 * with no submit boundary of their own (e.g. ProjectSettingsPanel's title,
 * which writes to state on every keystroke). Unlike validateRequiredText,
 * this never surfaces an error — it silently keeps the value backend-safe
 * as the user types.
 */
export function sanitizeSafeLabel(raw, { maxLength } = {}) {
  let value = sanitizeText(raw, { collapseWhitespace: false }).replace(
    SAFE_LABEL_STRIP_REGEX,
    "",
  );

  if (typeof maxLength === "number" && value.length > maxLength) {
    value = value.slice(0, maxLength);
  }

  return value;
}

/**
 * Sanitize + required/length/pattern check in one call, for the repeated
 * `if (!x.trim()) setError(...)` pattern across dialogs. Returns
 * { value, error } — error is null when valid.
 */
export function validateRequiredText(
  raw,
  {
    fieldLabel = "This field",
    maxLength,
    minLength = 1,
    allowNewlines = false,
    pattern,
    patternMessage,
  } = {},
) {
  const value = sanitizeText(raw, {
    maxLength,
    collapseWhitespace: true,
    allowNewlines,
  });

  if (value.length < minLength) {
    return { value, error: `${fieldLabel} is required.` };
  }

  if (pattern && !pattern.test(value)) {
    return { value, error: patternMessage || `${fieldLabel} is invalid.` };
  }

  return { value, error: null };
}

export function isValidEmail(value) {
  return EMAIL_REGEX.test((value || "").trim());
}

/**
 * Granular password-complexity check. Returns { valid, reasons } where
 * reasons is a list of human-readable requirements still unmet.
 */
export function validatePasswordComplexity(value) {
  const password = value || "";
  const reasons = [];

  if (password.length < 8) reasons.push("at least 8 characters");
  if (!/[a-z]/.test(password)) reasons.push("a lowercase letter");
  if (!/[A-Z]/.test(password)) reasons.push("an uppercase letter");
  if (!/\d/.test(password)) reasons.push("a number");
  if (!/[^A-Za-z0-9]/.test(password)) reasons.push("a symbol");

  return { valid: reasons.length === 0, reasons };
}

/**
 * Generalizes CreateWorkspaceDialog's file-validation pattern. allowedTypes
 * accepts exact MIME strings ("image/png") or wildcard prefixes
 * ("image/*", "video/*"). Returns an error string or null.
 */
export function validateFile(file, { allowedTypes, maxBytes, fieldLabel = "File" } = {}) {
  if (!file) return null;

  if (allowedTypes) {
    const types = allowedTypes instanceof Set ? allowedTypes : new Set(allowedTypes);
    const mimeType = file.type || "";

    const isAllowed = [...types].some((allowed) => {
      if (allowed.endsWith("/*")) {
        return mimeType.startsWith(allowed.slice(0, -1));
      }
      return mimeType === allowed;
    });

    if (!isAllowed) {
      return `${fieldLabel} has an unsupported file type.`;
    }
  }

  if (typeof maxBytes === "number" && file.size > maxBytes) {
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(maxBytes % (1024 * 1024) === 0 ? 0 : 1);
    return `${fieldLabel} must be ${maxMb}MB or smaller.`;
  }

  return null;
}
