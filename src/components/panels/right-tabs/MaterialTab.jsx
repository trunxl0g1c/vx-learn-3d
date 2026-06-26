import Button from "../../ui/button";

export default function MaterialTab({
  material,
  saveMaterial,
  isSavingPackage,
  savePackageProgress,
  savePackageStatus,
}) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="rounded-2xl bg-dark-alpha p-4">
        <div className="mb-3 text-lg font-semibold">Package</div>

        <InfoRow label="Project" value={material?.title || "Aircraft Engine"} />
        <InfoRow label="Version" value={material?.version || "1.0.0"} />
        <InfoRow label="Author" value={material?.author || "Trunx"} />
        <InfoRow
          label="Thumbnail"
          value={material?.thumbnail ? "✓ Available" : "—"}
        />
      </div>

      <Button onClick={saveMaterial} disabled={isSavingPackage}>
        {isSavingPackage ? "Saving Package..." : "Save Package"}
      </Button>
      {(isSavingPackage || savePackageStatus) && (
        <div className="rounded-xl bg-dark-alpha p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-secondary-default">
            <span>{savePackageStatus || "Saving Package"}</span>
            <span>{savePackageProgress || 0}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-accent-main transition-all duration-200"
              style={{ width: `${savePackageProgress || 0}%` }}
            />
          </div>
        </div>
      )}
      <Button disabled>Export Package</Button>
      <Button disabled>Open Package</Button>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold uppercase text-secondary-default">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">
        {value}
      </div>
    </div>
  );
}