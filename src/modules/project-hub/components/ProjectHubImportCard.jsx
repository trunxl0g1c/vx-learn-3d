import { useRef } from "react";
import MaterialIcon from "../../../components/ui/material-icon";

export default function ProjectHubImportCard({ onImport, isImporting = false }) {
  const inputRef = useRef(null);

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files?.[0] || null;

    try {
      if (selectedFile) {
        await onImport?.(selectedFile);
      }
    } finally {
      event.target.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".vxpack,.vxenc,application/zip"
        className="hidden"
        onChange={handleFileChange}
      />

      <button
        type="button"
        disabled={isImporting}
        onClick={() => inputRef.current?.click()}
        className="flex min-h-[190px] w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-secondary-dark bg-dark px-4 text-center text-white transition hover:border-accent-main hover:bg-dark-alpha/72 disabled:cursor-wait disabled:opacity-60 sm:min-h-[200px] xl:min-h-[210px]"
      >
        <MaterialIcon
          name={isImporting ? "progress_activity" : "upload_file"}
          size={55}
          className={[
            "text-accent-main",
            isImporting ? "animate-spin" : "",
          ].join(" ")}
        />
        <span className="mt-5 text-sm font-normal sm:mt-6">
          {isImporting ? "Importing Project..." : "Import Project"}
        </span>
      </button>
    </>
  );
}
