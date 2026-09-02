import { useEffect, useMemo, useState } from "react";
import Button from "../../ui/button";
import MaterialIcon from "../../ui/material-icon";
import SelectField from "../../ui/select";
import ConfirmationDialog from "../../dialog/ConfirmationDialog";

function LicenseInput({ label, value, placeholder, onChange, type = "text" }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-normal text-contrast-grayout">
        {label}
      </label>
      <input
        type={type}
        value={value || ""}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-[42px] w-full rounded-lg border border-secondary-default bg-transparent px-3 text-sm font-normal text-white outline-none placeholder:text-contrast-grayout focus:ring-1 focus:ring-[#67D4EA]"
      />
    </div>
  );
}

export default function ModelLicenseSettingsControls({
  models = [],
  onUpdateModelLicense,
  onReadModelLicenseMetadata,
  onRemoveAdditionalGlb,
  embedded = false,
}) {
  const normalizedModels = Array.isArray(models) ? models : [];
  const [selectedModelId, setSelectedModelId] = useState(
    normalizedModels[0]?.modelAssetId || "",
  );
  const [reading, setReading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (
      selectedModelId &&
      normalizedModels.some((model) => model.modelAssetId === selectedModelId)
    ) {
      return;
    }
    setSelectedModelId(normalizedModels[0]?.modelAssetId || "");
  }, [normalizedModels, selectedModelId]);

  const activeModel = useMemo(
    () =>
      normalizedModels.find(
        (model) => model.modelAssetId === selectedModelId,
      ) ||
      normalizedModels[0] ||
      null,
    [normalizedModels, selectedModelId],
  );

  if (!activeModel) return null;

  const updateField = (field, value) => {
    setStatus("");
    onUpdateModelLicense?.(activeModel.modelAssetId, { [field]: value });
  };

  const readMetadata = async () => {
    if (reading) return;
    setReading(true);
    setStatus("");

    try {
      const detected = await onReadModelLicenseMetadata?.(
        activeModel.modelAssetId,
      );
      setStatus(
        detected?.metadataDetected
          ? "Metadata GLB berhasil dibaca dan dimasukkan ke form."
          : "GLB terbaca, tetapi metadata lisensi tidak ditemukan.",
      );
    } catch (error) {
      setStatus(error?.message || "Gagal membaca metadata GLB.");
    } finally {
      setReading(false);
    }
  };

  const canRemoveActiveModel =
    !activeModel.isPrimary && typeof onRemoveAdditionalGlb === "function";

  const removeActiveModel = async () => {
    if (!canRemoveActiveModel || removing) return;

    setRemoving(true);
    setStatus("");

    try {
      await onRemoveAdditionalGlb(activeModel.modelAssetId);
      setRemoveDialogOpen(false);
      setStatus("GLB berhasil dihapus dari project.");
    } catch (error) {
      setStatus(error?.message || "Gagal menghapus GLB dari project.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section
      className={
        embedded
          ? ""
          : "rounded-xl border border-secondary-default/60 bg-white/[0.025] p-4"
      }
    >
      {!embedded && (
        <div className="mb-4 flex items-start gap-3 cursor-pointer">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-secondary-default/40 bg-secondary-default/10 text-secondary-default">
            <MaterialIcon name="copyright" fill className="size-6" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white">3D License</div>
            <p className="mt-1 text-xs leading-5 text-contrast-grayout">
              Isi lisensi secara manual atau baca metadata yang tersimpan di
              GLB. Informasi ini akan ditampilkan di Player.
            </p>
          </div>
        </div>
      )}

      {embedded && (
        <p className="mb-4 text-xs leading-5 text-contrast-grayout">
          Isi lisensi secara manual atau baca metadata yang tersimpan di GLB.
          Informasi ini akan ditampilkan di Player.
        </p>
      )}

      {normalizedModels.length > 1 && (
        <div className="mb-4">
          <label className="mb-2 block text-xs text-contrast-grayout">
            GLB to edit
          </label>
          <SelectField
            value={activeModel.modelAssetId}
            onChange={(value) => {
              setSelectedModelId(value);
              setStatus("");
            }}
            options={normalizedModels.map((model, index) => ({
              value: model.modelAssetId,
              label: `${index + 1}. ${model.fileName || model.modelName || "Model GLB"}${
                model.isPrimary ? " (Primary)" : ""
              }`,
            }))}
          />
        </div>
      )}

      {normalizedModels.length > 1 && (
        <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-[11px] leading-4 text-white/60">
          Editing license for:{" "}
          <span className="font-medium text-white/85">
            {activeModel.fileName || activeModel.modelName || "Model GLB"}
          </span>
        </div>
      )}

      <div className="space-y-3">
        <LicenseInput
          label="Model Name"
          value={activeModel.modelName}
          placeholder="Model name"
          onChange={(value) => updateField("modelName", value)}
        />
        <LicenseInput
          label="Creator Name"
          value={activeModel.creatorName}
          placeholder="Creator / author"
          onChange={(value) => updateField("creatorName", value)}
        />
        <LicenseInput
          label="License"
          value={activeModel.license}
          placeholder="e.g. CC BY 4.0"
          onChange={(value) => updateField("license", value)}
        />
        <LicenseInput
          label="Source / Download URL"
          value={activeModel.sourceUrl}
          placeholder="https://..."
          type="url"
          onChange={(value) => updateField("sourceUrl", value)}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="cyanOutline"
          disabled={reading || removing || !onReadModelLicenseMetadata}
          onClick={readMetadata}
        >
          <MaterialIcon
            name={reading ? "hourglass_top" : "document_search"}
            className={reading ? "animate-pulse mr-1" : "mr-1"}
            fill={1}
            size={20}
          />
          {reading ? "Reading..." : "Read GLB"}
        </Button>

        {/* {typeof onRemoveAdditionalGlb === "function" && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={!canRemoveActiveModel || removing || reading}
            onClick={() => setRemoveDialogOpen(true)}
            title={
              activeModel.isPrimary
                ? "Primary GLB tidak dapat dihapus dari project."
                : `Remove ${activeModel.fileName || activeModel.modelName || "GLB"}`
            }
          >
            <MaterialIcon name="delete" fill={1} size={20} className="mr-1" />
            Remove GLB
          </Button>
        )} */}

        {activeModel.metadataDetected && (
          <span className="inline-flex min-h-8 items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 text-[11px] text-emerald-200">
            Metadata detected
          </span>
        )}
      </div>

      {(activeModel.metadataGenerator || activeModel.metadataCopyright) && (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-[11px] leading-5 text-white/55">
          {activeModel.metadataGenerator && (
            <div>Generator: {activeModel.metadataGenerator}</div>
          )}
          {activeModel.metadataCopyright && (
            <div>Copyright: {activeModel.metadataCopyright}</div>
          )}
        </div>
      )}

      {status && (
        <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs leading-5 text-white/70">
          {status}
        </div>
      )}

      <ConfirmationDialog
        open={removeDialogOpen}
        title="Remove GLB from Project?"
        message={`Hapus ${activeModel.fileName || activeModel.modelName || "GLB"} dari project?`}
        description="File GLB tambahan dan data 3D License-nya akan dihapus dari project. Primary GLB tidak akan terpengaruh. Tindakan ini tidak dapat dibatalkan."
        confirmText="Remove GLB"
        isLoading={removing}
        onClose={() => {
          if (!removing) setRemoveDialogOpen(false);
        }}
        onConfirm={removeActiveModel}
      />
    </section>
  );
}
