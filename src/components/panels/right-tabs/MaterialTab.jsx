export default function MaterialTab({ material }) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="rounded-2xl bg-dark-alpha p-4">
        <div className="mb-3 text-lg font-normal">Package</div>

        <InfoRow label="Project" value={material?.title || "Aircraft Engine"} />
        <InfoRow label="Version" value={material?.version || "1.0.0"} />
        <InfoRow label="Author" value={material?.author || "Trunx"} />
        <InfoRow
          label="Thumbnail"
          value={material?.thumbnail ? "✓ Available" : "—"}
        />
        <InfoRow
          label="Object Descriptions"
          value={String(material?.chapters?.length || 0)}
        />
        <InfoRow label="Flows" value={String(material?.flows?.length || 0)} />
        <InfoRow
          label="Procedures"
          value={String(material?.procedures?.length || 0)}
        />
      </div>

      <div className="rounded-xl border border-secondary-dark bg-dark-alpha p-3 text-xs leading-5 text-contrast-grayout">
        Use the <span className="font-semibold text-secondary-default">Export</span>{" "}
        button in the top bar to save the latest VXPACK project, including the
        GLB model and current authoring manifest.
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="mb-3">
      <div className="text-xs font-normal uppercase text-secondary-default">
        {label}
      </div>
      <div className="mt-1 text-sm font-normal text-white">{value}</div>
    </div>
  );
}
