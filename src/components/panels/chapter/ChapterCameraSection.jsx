import { Camera } from "lucide-react";
import Button from "../../ui/button";

export default function ChapterCameraSection({
  panelSectionStyle,
  saveCameraViewToActiveChapter,
}) {
  return (
    <section className="space-y-2 p-4">
      <label className="block text-sm font-normal text-contrast-grayout">
        Camera View
      </label>

      <Button
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          saveCameraViewToActiveChapter();
        }}
      >
        <Camera className="mr-2 size-4" /> Save Camera View
      </Button>
    </section>
  );
}
