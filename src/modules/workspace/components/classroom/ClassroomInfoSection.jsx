import { useEffect, useId, useState } from "react";
import Button from "../../../../components/ui/button";
import Input from "../../../../components/ui/input";
import InlineAlert from "../../../../components/ui/inline-alert";
import { useUpdateClassroom } from "../../../classroom/api/classrooms";
import {
  SAFE_LABEL_REGEX,
  SAFE_LABEL_REGEX_MESSAGE,
  sanitizeText,
  validateRequiredText,
} from "../../../../utils/validation";

const NAME_MAX_LENGTH = 40;
const DESCRIPTION_MAX_LENGTH = 200;

// Renaming/re-describing a classroom was already fully supported by the API
// (updateClassroomRequest) but had no UI anywhere — the old "pencil" icon on
// the classroom row actually opened the *members* dialog, not this. That
// mismatch was a real source of confusion; this section is the fix.
//
// The parent renders this keyed by classroom.id, so switching the selected
// classroom fully remounts it — local state (name/description drafts, the
// error banner, "Saved" flash) starts fresh per classroom rather than
// needing an effect to resync it from a changed prop.
export default function ClassroomInfoSection({ classroom, canManage }) {
  const nameId = useId();
  const descriptionId = useId();
  const [name, setName] = useState(classroom.name || "");
  const [description, setDescription] = useState(classroom.description || "");
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (!justSaved) return undefined;

    const timer = setTimeout(() => setJustSaved(false), 4000);
    return () => clearTimeout(timer);
  }, [justSaved]);

  const updateClassroom = useUpdateClassroom({
    onError: (mutationError) => {
      setError(
        mutationError?.response?.data?.message ||
          "Failed to update classroom.",
      );
    },
    onSuccess: () => setJustSaved(true),
  });

  const isDirty =
    name !== (classroom.name || "") ||
    description !== (classroom.description || "");

  async function handleSave() {
    setError("");

    const { value: sanitizedName, error: nameError } = validateRequiredText(
      name,
      {
        fieldLabel: "Classroom name",
        maxLength: NAME_MAX_LENGTH,
        pattern: SAFE_LABEL_REGEX,
        patternMessage: SAFE_LABEL_REGEX_MESSAGE,
      },
    );

    if (nameError) {
      setError(nameError);
      return;
    }

    updateClassroom.mutate({
      id: classroom.id,
      name: sanitizedName,
      description: sanitizeText(description, {
        maxLength: DESCRIPTION_MAX_LENGTH,
        allowNewlines: true,
      }),
    });
  }

  return (
    <div className="space-y-4">
      <InlineAlert type="error" message={error} autoHide={false} />

      <div className="space-y-2">
        <label
          htmlFor={nameId}
          className="block text-sm font-normal text-contrast-grayout"
        >
          Classroom Name
        </label>
        <div className="relative">
          <Input
            id={nameId}
            value={name}
            maxLength={NAME_MAX_LENGTH}
            disabled={!canManage || updateClassroom.isPending}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            className="h-[42px] rounded-lg bg-dark-alpha!"
            inputClassName="text-sm"
          />
          <span className="absolute bottom-2 right-3 text-[9px] font-normal text-contrast-grayout">
            {name.length}/{NAME_MAX_LENGTH}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <label
          htmlFor={descriptionId}
          className="block text-sm font-normal text-contrast-grayout"
        >
          Description
        </label>
        <div className="relative">
          <textarea
            id={descriptionId}
            value={description}
            maxLength={DESCRIPTION_MAX_LENGTH}
            disabled={!canManage || updateClassroom.isPending}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Type a short description here"
            className="w-full resize-none rounded-lg border border-grayout-dark bg-dark-alpha px-4 py-3 text-sm text-white outline-none placeholder:text-contrast-grayout focus:border-secondary-default disabled:opacity-60"
          />
          <span className="absolute bottom-2 right-3 text-[9px] font-normal text-contrast-grayout">
            {description.length}/{DESCRIPTION_MAX_LENGTH}
          </span>
        </div>
      </div>

      {canManage && (
        <div className="flex items-center gap-3">
          <Button
            variant="gold"
            size="sm"
            disabled={!isDirty || updateClassroom.isPending}
            onClick={handleSave}
            className="rounded-lg"
          >
            {updateClassroom.isPending ? "Saving..." : "Save Changes"}
          </Button>

          {!isDirty && justSaved && (
            <span className="text-xs text-emerald-300">Saved</span>
          )}
        </div>
      )}
    </div>
  );
}
