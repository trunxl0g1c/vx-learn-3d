import { useState } from "react";
import ProjectHubLayout from "../../project-hub/layouts/ProjectHubLayout";
import Button from "../../../components/ui/button";
import Input from "../../../components/ui/input";
import Checkbox from "../../../components/ui/checkbox";
import InlineAlert from "../../../components/ui/inline-alert";
import MaterialIcon from "../../../components/ui/material-icon";
import {
  useStorageSettings,
  useUpdateStorageSettings,
} from "./api/storageSettings";

const DRIVER_OPTIONS = [
  { value: "local", label: "Local Disk", icon: "dns" },
  { value: "s3", label: "Amazon S3 / S3-compatible", icon: "cloud" },
];

function buildInitialForm(settings) {
  return {
    driver: settings?.driver ?? settings?.licensedStorageType ?? "local",
    localBasePath: settings?.localBasePath ?? "",
    s3Bucket: settings?.s3Bucket ?? "",
    s3Region: settings?.s3Region ?? "",
    s3Endpoint: settings?.s3Endpoint ?? "",
    s3ForcePathStyle: Boolean(settings?.s3ForcePathStyle),
    s3AccessKeyId: settings?.s3AccessKeyId ?? "",
    s3SecretAccessKey: "",
  };
}

export default function AdminStorageSettingsPage() {
  const { data: settings, isLoading, isError, error } = useStorageSettings();
  const updateSettings = useUpdateStorageSettings();

  const [form, setForm] = useState(() => buildInitialForm(settings));
  const [justSaved, setJustSaved] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [initializedFromSettings, setInitializedFromSettings] = useState(
    Boolean(settings),
  );

  // Sync the form from the fetched settings exactly once, the first time
  // they arrive — not on every refetch, which would otherwise wipe
  // in-progress edits the admin hasn't saved yet.
  if (settings && !initializedFromSettings) {
    setInitializedFromSettings(true);
    setForm(buildInitialForm(settings));
  }

  const licensedStorageType = settings?.licensedStorageType ?? null;

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setJustSaved(false);
  }

  function handleSave() {
    updateSettings.mutate(
      {
        driver: form.driver,
        localBasePath: form.driver === "local" ? form.localBasePath : undefined,
        s3Bucket: form.driver === "s3" ? form.s3Bucket : undefined,
        s3Region: form.driver === "s3" ? form.s3Region : undefined,
        s3Endpoint: form.driver === "s3" ? form.s3Endpoint || undefined : undefined,
        s3ForcePathStyle: form.driver === "s3" ? form.s3ForcePathStyle : undefined,
        s3AccessKeyId: form.driver === "s3" ? form.s3AccessKeyId : undefined,
        s3SecretAccessKey:
          form.driver === "s3" && form.s3SecretAccessKey
            ? form.s3SecretAccessKey
            : undefined,
      },
      {
        onSuccess: () => {
          setJustSaved(true);
          setForm((prev) => ({ ...prev, s3SecretAccessKey: "" }));
        },
      },
    );
  }

  return (
    <ProjectHubLayout>
      <div className="max-w-[640px] space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-medium text-white">
            Environment &amp; Storage Settings
          </h1>
        </div>

        {isError && (
          <InlineAlert
            type="error"
            autoHide={false}
            message={
              error?.response?.data?.message ||
              "Failed to load storage settings."
            }
          />
        )}

        {updateSettings.isError && (
          <InlineAlert
            type="error"
            autoHide={false}
            message={
              updateSettings.error?.response?.data?.message ||
              "Failed to save storage settings."
            }
          />
        )}

        {justSaved && !updateSettings.isError && (
          <InlineAlert
            type="warning"
            autoHide={false}
            onClose={() => setJustSaved(false)}
            message="Settings saved. Restart the vxcubed-be service for the new storage configuration to take effect."
          />
        )}

        {isLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-10 animate-pulse rounded-lg bg-white/5"
              />
            ))}
          </div>
        )}

        {!isLoading && !isError && (
          <div className="space-y-5 rounded-xl border border-divider-main bg-dark-alpha p-5">
            <div className="space-y-2">
              <p className="text-sm text-secondary-default">Storage type</p>

              <div className="flex flex-wrap gap-3">
                {DRIVER_OPTIONS.map((option) => {
                  const isLicensed =
                    !licensedStorageType || option.value === licensedStorageType;
                  const isSelected = form.driver === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      title={
                        isLicensed
                          ? undefined
                          : `Your license only permits "${licensedStorageType}" storage.`
                      }
                      disabled={!isLicensed}
                      onClick={() => updateField("driver", option.value)}
                      className={[
                        "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition",
                        isSelected
                          ? "border-accent-main bg-accent-main/15 text-white"
                          : "border-divider-main bg-transparent text-secondary-default hover:bg-white/5",
                        !isLicensed && "cursor-not-allowed opacity-40 hover:bg-transparent",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <MaterialIcon name={option.icon} size={18} />
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {licensedStorageType && (
                <p className="text-xs text-contrast-grayout">
                  Your license permits: <strong>{licensedStorageType}</strong>
                </p>
              )}
            </div>

            {form.driver === "local" && (
              <div className="space-y-2">
                <p className="text-sm text-secondary-default">
                  Local folder path
                </p>
                <Input
                  value={form.localBasePath}
                  placeholder="e.g. D:\vxcubed-storage or /var/lib/vxcubed/uploads"
                  onChange={(event) =>
                    updateField("localBasePath", event.target.value)
                  }
                  className="rounded-lg"
                />
                <p className="text-xs text-contrast-grayout">
                  A folder on the machine running vxcubed-be. It must exist and be
                  writable by the service.
                </p>
              </div>
            )}

            {form.driver === "s3" && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm text-secondary-default">Bucket</p>
                  <Input
                    value={form.s3Bucket}
                    placeholder="my-vxcubed-bucket"
                    onChange={(event) =>
                      updateField("s3Bucket", event.target.value)
                    }
                    className="rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-secondary-default">Region</p>
                  <Input
                    value={form.s3Region}
                    placeholder="us-east-1"
                    onChange={(event) =>
                      updateField("s3Region", event.target.value)
                    }
                    className="rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-secondary-default">
                    Endpoint (optional — leave blank for AWS S3)
                  </p>
                  <Input
                    value={form.s3Endpoint}
                    placeholder="https://<account-id>.r2.cloudflarestorage.com"
                    onChange={(event) =>
                      updateField("s3Endpoint", event.target.value)
                    }
                    className="rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-secondary-default">
                    Access Key ID
                  </p>
                  <Input
                    value={form.s3AccessKeyId}
                    placeholder="AKIA..."
                    onChange={(event) =>
                      updateField("s3AccessKeyId", event.target.value)
                    }
                    className="rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-secondary-default">
                    Secret Access Key
                  </p>
                  <Input
                    type={showSecret ? "text" : "password"}
                    value={form.s3SecretAccessKey}
                    placeholder={
                      settings?.s3SecretAccessKeySet
                        ? "•••••••• (unchanged — leave blank to keep the current secret)"
                        : "Enter secret access key"
                    }
                    onChange={(event) =>
                      updateField("s3SecretAccessKey", event.target.value)
                    }
                    className="rounded-lg"
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowSecret((prev) => !prev)}
                        className="cursor-pointer text-secondary-default hover:text-white"
                        aria-label={
                          showSecret ? "Hide secret" : "Show secret"
                        }
                      >
                        <MaterialIcon
                          name={showSecret ? "visibility_off" : "visibility"}
                          size={20}
                        />
                      </button>
                    }
                  />
                </div>

                <Checkbox
                  checked={form.s3ForcePathStyle}
                  onCheckedChange={(value) =>
                    updateField("s3ForcePathStyle", value)
                  }
                  label="Force path-style addressing (needed for MinIO / most non-AWS S3-compatible endpoints)"
                />
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                variant="gold"
                size="sm"
                disabled={updateSettings.isPending}
                onClick={handleSave}
                className="rounded-lg"
              >
                {updateSettings.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </ProjectHubLayout>
  );
}
