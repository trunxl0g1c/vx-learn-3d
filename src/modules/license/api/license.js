import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";

const FEATURE_LABELS = {
  max_user_viewer: "Max Viewer Users",
  max_user_editor: "Max Editor Users",
  max_workspace: "Max Workspaces",
  max_content: "Max Content per Workspace",
  type_storage: "Storage Type",
  max_storage: "Max Storage (GB)",
  feature_flow: "Flow & Procedure",
  application_mode: "Application Mode",
  standalone_export_enabled: "Standalone Export",
};

function humanizeFeatureKey(key) {
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// GET /license/status (vxcubed-be's src/license/README.md) returns
// { license_to, expiry, features, usage, publicKeyFingerprint }. `features`
// is a license-be-defined map (driven by the platform's featureSchema), so
// this reads it generically rather than assuming a fixed key set.
// `max_workspaces` is the only feature paired with a live "used" count
// (`usage.workspaces`) — it's the only one enforced as a single
// deployment-wide total rather than per-workspace (see
// vxcubed-be's workspace.service.ts create()); max_content_per_workspace and
// max_storage_mb are per-workspace limits with no single "used" figure to
// pair them with here, so they're listed as plain limits instead.
function normalizeLicenseInfo(data) {
  if (!data) return null;

  const features = data.features || {};
  const usage = data.usage || {};

  const quotas = [];
  if (features.max_workspace != null) {
    quotas.push({
      key: "max_workspace",
      label: FEATURE_LABELS.max_workspace,
      used: usage.workspaces,
      max: features.max_workspace,
    });
  }

  const otherFeatures = Object.entries(features)
    .filter(([key]) => key !== "max_workspace")
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
    ...options,
  });
}
