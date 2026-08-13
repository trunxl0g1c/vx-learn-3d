import { useState } from "react";
import { X } from "lucide-react";
import Button from "../../../components/ui/button";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import { useUpdateCategory } from "../../category/api/categories";
import { slugify } from "../../../utils/slugify";
import {
  SAFE_LABEL_REGEX,
  SAFE_LABEL_REGEX_MESSAGE,
  validateRequiredText,
} from "../../../utils/validation";

const NAME_MAX_LENGTH = 64;

export default function EditCategoryDialog({ open, category, onClose, onUpdated }) {
  const [name, setName] = useState(category?.name || "");
  const [error, setError] = useState("");

  const updateCategory = useUpdateCategory();

  if (!open) return null;

  const isSubmitting = updateCategory.isPending;

  function handleClose() {
    if (isSubmitting) return;

    onClose?.();
  }

  async function handleSubmit() {
    setError("");

    const { value: sanitizedName, error: nameError } = validateRequiredText(
      name,
      {
        fieldLabel: "Category name",
        maxLength: NAME_MAX_LENGTH,
        pattern: SAFE_LABEL_REGEX,
        patternMessage: SAFE_LABEL_REGEX_MESSAGE,
      },
    );

    if (nameError) {
      setError(nameError);
      return;
    }

    const slug = slugify(sanitizedName);

    if (!slug) {
      setError("Category name must contain at least one letter or number.");
      return;
    }

    try {
      const updated = await updateCategory.mutateAsync({
        id: category.id,
        name: sanitizedName,
        slug,
      });

      onUpdated?.(updated);
    } catch (mutationError) {
      setError(
        mutationError?.response?.data?.message ||
          "Error encountered while updating category.",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-999 grid place-items-center bg-black/45 backdrop-blur-sm">
      <div className="w-125 overflow-hidden rounded-[20px] bg-dark-alpha text-white shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="flex h-18 items-center justify-between bg-dark-alpha px-5">
          <h2 className="text-base font-normal">Edit Category</h2>

          {!isSubmitting && (
            <button
              type="button"
              onClick={handleClose}
              className="grid size-9 cursor-pointer place-items-center rounded-lg text-[#69cbe3] hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="size-6" />
            </button>
          )}
        </div>

        <div className="space-y-4 px-5 pb-5 pt-4">
          <InlineAlert type="error" message={error} autoHide={false} />

          <div className="space-y-2">
            <label className="block text-sm font-normal text-contrast-grayout">
              Category Name
            </label>

            <div className="relative">
              <Input
                value={name}
                maxLength={NAME_MAX_LENGTH}
                placeholder="e.g. Otomotif"
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                disabled={isSubmitting}
                className={[
                  "h-[44px] rounded-lg bg-dark-alpha!",
                  error ? "border-warning-main!" : "",
                ].join(" ")}
                inputClassName="text-sm italic"
              />

              <span className="absolute bottom-2 right-3 text-[9px] font-normal text-contrast-grayout">
                {name.length}/{NAME_MAX_LENGTH}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 border-t border-[#315263] px-6 py-6">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border-accent-contrast! bg-transparent text-base font-normal tracking-[4px]"
          >
            CANCEL
          </Button>

          <Button
            variant="gold"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 rounded-xl text-base font-normal tracking-[4px]"
          >
            {isSubmitting ? "SAVING..." : "SAVE"}
          </Button>
        </div>
      </div>
    </div>
  );
}
