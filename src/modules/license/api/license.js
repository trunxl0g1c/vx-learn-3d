import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";

const FEATURE_LABELS = {
  max_user_viewer: "Max Viewer Users",
  max_user_editor: "Max Editor Users",
  max_workspace: "Max Workspaces",
  max_content: "Max Content per Workspace",
  type_storage: "Storage Type",
  max_storage: "Max Storage (GB)",
  pro_tools: "Pro Tools",
  application_mode: "Application Mode",
};

// Enforced server-side (vxcubed-be's export.service.ts) but deliberately not
// surfaced in the License Information dialog — an internal/administrative
// toggle, not something an end user needs visibility into.
const HIDDEN_FEATURE_KEYS = new Set(["standalone_export_enabled"]);

function humanizeFeatureKey(key) {
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// GET /license/status (vxcubed-be's src/license/README.md) returns
// { license_to, expiry, features, usage, publicKeyFingerprint }. `features`
// is a license-be-defined map (driven by the platform's featureSchema), so
// this reads it generically rather than assuming a fixed key set.
// `max_workspace`/`max_user_editor`/`max_user_viewer` are each paired with a
// live "used" count (`usage.workspaces`/`usage.editorUsers`/`usage.viewerUsers`)
// — all three are enforced as single deployment-wide totals rather than
// per-workspace (see vxcubed-be's workspace.service.ts create() and
// assertSeatAvailable()). `max_content` is a per-workspace limit instead,
// paired with `usage.contentByWorkspace` (one row per workspace the current
// user belongs to) rather than a single number. `max_storage` has no cheap
// "used" figure to pair it with, so it's listed as a plain limit.
const DEPLOYMENT_WIDE_QUOTAS = [
  { featureKey: "max_workspace", usageKey: "workspaces" },
  { featureKey: "max_user_editor", usageKey: "editorUsers" },
  { featureKey: "max_user_viewer", usageKey: "viewerUsers" },
];

function normalizeLicenseInfo(data) {
  if (!data) return null;

  const features = data.features || {};
  const usage = data.usage || {};

  const quotas = DEPLOYMENT_WIDE_QUOTAS.filter(
    ({ featureKey }) => features[featureKey] != null,
  ).map(({ featureKey, usageKey }) => ({
    key: featureKey,
    label: FEATURE_LABELS[featureKey],
    used: usage[usageKey],
    max: features[featureKey],
  }));

  const contentByWorkspace =
    features.max_content != null
      ? (usage.contentByWorkspace || []).map((entry) => ({
          key: entry.workspaceId,
          label: entry.name,
          used: entry.count,
          max: features.max_content,
        }))
      : [];

  const excludedFromOtherFeatures = new Set([
    ...DEPLOYMENT_WIDE_QUOTAS.map(({ featureKey }) => featureKey),
    "max_content",
    ...HIDDEN_FEATURE_KEYS,
  ]);

  const otherFeatures = Object.entries(features)
    .filter(([key]) => !excludedFromOtherFeatures.has(key))
    .map(([key, value]) => ({
      key,
      label: FEATURE_LABELS[key] || humanizeFeatureKey(key),
      value,
    }));

  return {
    licenseTo: data.license_to || "—",
    expiresAt: data.expiry || null,
    publicKeyFingerprint: data.publicKeyFingerprint || null,
    quotas,
    contentByWorkspace,
    otherFeatures,
    features,
  };
}

export async function getLicenseInfoRequest() {
  const response = await apiClient.get("/license/status");

  return normalizeLicenseInfo(response.data?.data);
}

export function useLicenseInfo(options = {}) {
  return useQuery({
    queryKey: ["license", "status"],
    queryFn: getLicenseInfoRequest,
    staleTime: 60_000,
    refetchInterval: 60_000,
    ...options,
  });
}
