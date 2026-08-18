import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";

const FEATURE_LABELS = {
  max_workspaces: "Max Workspaces",
  max_content_per_workspace: "Max Content per Workspace",
  max_storage_mb: "Max Storage (MB)",
  standalone_export_enabled: "Standalone Export",
  nested_object_descriptions_enabled: "Nested Object Descriptions",
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
  if (features.max_workspaces != null) {
    quotas.push({
      key: "max_workspaces",
      label: FEATURE_LABELS.max_workspaces,
      used: usage.workspaces,
      max: features.max_workspaces,
    });
  }

  const otherFeatures = Object.entries(features)
    .filter(([key]) => key !== "max_workspaces")
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
