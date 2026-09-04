import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import ProjectHubLayout from "../../project-hub/layouts/ProjectHubLayout";
import Button from "../../../components/ui/button";
import Input from "../../../components/ui/input";
import InlineAlert from "../../../components/ui/inline-alert";
import MaterialIcon from "../../../components/ui/material-icon";
import { useCategories, useDeleteCategory } from "../../category/api/categories";

const CreateCategoryDialog = lazy(() => import("./CreateCategoryDialog"));
const EditCategoryDialog = lazy(() => import("./EditCategoryDialog"));
const ConfirmationDialog = lazy(
  () => import("../../../components/dialog/ConfirmationDialog"),
);

const SEARCH_DEBOUNCE_MS = 300;

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

export default function AdminCategoriesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: categories = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useCategories({ search: debouncedSearch || undefined });

  const deleteCategory = useDeleteCategory({
    onSuccess: () => setDeleteTarget(null),
  });

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [categories],
  );

  return (
    <ProjectHubLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-medium text-white">Category Management</h1>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input
            value={search}
            placeholder="Search category"
            onChange={(event) => setSearch(event.target.value)}
            className="h-9! w-full! min-w-0 rounded-lg sm:max-w-[320px]"
            leftIcon={
              <MaterialIcon
                name="search"
                fill={1}
                size={24}
                className="text-secondary-default"
              />
            }
            inputClassName="min-w-0 text-sm italic"
          />

          <Button
            variant="gold"
            size="sm"
            onClick={() => setOpenCreate(true)}
            className="rounded-lg"
          >
            <MaterialIcon name="add" size={18} />
            Create New Category
          </Button>
        </div>

        {isError && (
          <InlineAlert
            type="error"
            autoHide={false}
            message={
              error?.response?.data?.message || "Failed to load categories."
            }
          />
        )}

        {deleteCategory.isError && (
          <InlineAlert
            type="error"
            autoHide={false}
            message={
              deleteCategory.error?.response?.data?.message ||
              "Failed to delete category."
            }
          />
        )}

        <div className="overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-divider-main text-sm tracking-wide text-secondary-default">
                  <th className="px-4 py-3 font-normal">Name</th>
                  <th className="px-4 py-3 font-normal">Slug</th>
                  <th className="px-4 py-3 font-normal">Created At</th>
                  <th className="px-4 py-3 font-normal" aria-label="Actions" />
                </tr>
              </thead>

              <tbody>
                {sortedCategories.map((category) => (
                  <tr
                    key={category.id}
                    className="border-b border-divider-main last:border-b-0 hover:bg-white/5"
                  >
                    <td className="px-4 py-3">
                      <span className="truncate font-medium text-accent-contrast">
                        {category.name}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-white">{category.slug}</td>

                    <td className="px-4 py-3 text-white">
                      {formatDate(category.createdAt)}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setEditTarget(category)}
                          className="grid size-8 cursor-pointer place-items-center rounded-lg text-secondary-default transition hover:bg-white/10"
                          aria-label={`Edit ${category.name}`}
                        >
                          <Pencil className="size-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(category)}
                          className="grid size-8 cursor-pointer place-items-center rounded-lg text-contrast-grayout transition hover:bg-warning-main/10 hover:text-warning-main"
                          aria-label={`Delete ${category.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!isLoading && !isError && sortedCategories.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-contrast-grayout"
                    >
                      No categories found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {isLoading && (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="h-10 animate-pulse rounded-lg bg-white/5"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {openCreate && (
        <Suspense fallback={null}>
          <CreateCategoryDialog
            open
            onClose={() => setOpenCreate(false)}
            onCreated={() => {
              setOpenCreate(false);
              refetch();
            }}
          />
        </Suspense>
      )}

      {editTarget && (
        <Suspense fallback={null}>
          <EditCategoryDialog
            open
            category={editTarget}
            onClose={() => setEditTarget(null)}
            onUpdated={() => {
              setEditTarget(null);
              refetch();
            }}
          />
        </Suspense>
      )}

      {deleteTarget && (
        <Suspense fallback={null}>
          <ConfirmationDialog
            open
            title="Delete Category?"
            message={`"${deleteTarget.name}" will be permanently deleted.`}
            description="Content still assigned to this category must be reassigned first, or this will fail."
            confirmText="Delete"
            cancelText="Cancel"
            confirmVariant="destructive"
            isLoading={deleteCategory.isPending}
            onClose={() => {
              if (!deleteCategory.isPending) setDeleteTarget(null);
            }}
            onConfirm={() => deleteCategory.mutate({ id: deleteTarget.id })}
          />
        </Suspense>
      )}
    </ProjectHubLayout>
  );
}
