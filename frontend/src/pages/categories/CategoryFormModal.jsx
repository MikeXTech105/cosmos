import { zodResolver } from "@hookform/resolvers/zod";
import { FolderKanban } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import AppModal from "../../components/common/AppModal";
import { categorySchema } from "../../utils/validationSchemas";

const getDefaultValues = (category) => ({
  name: category?.name ?? "",
  description: category?.description ?? "",
  isActive: category?.isActive ?? true,
});

const CategoryFormModal = ({
  category,
  isLoading,
  isOpen,
  mode,
  onClose,
  onSubmit,
}) => {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: getDefaultValues(category),
  });

  useEffect(() => {
    if (isOpen) {
      reset(getDefaultValues(category));
    }
  }, [category, isOpen, reset]);

  const submitForm = async (values) => {
    await onSubmit({
      name: values.name.trim(),
      description: values.description?.trim() ?? "",
      isActive: values.isActive,
    });
  };

  const title = isView
    ? "View Category"
    : isEdit
      ? "Edit Category"
      : "Add Category";

  return (
    <AppModal
      isOpen={isOpen}
      maxWidth="max-w-xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <FolderKanban className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Organize inventory items into reusable categories.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-12 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : (
        <form
          className="mt-6 space-y-5"
          onSubmit={handleSubmit(submitForm)}
        >
          <AppInput
            id="categoryName"
            label="Category Name"
            required
            disabled={isView}
            error={errors.name?.message}
            {...register("name")}
          />

          <div>
            <label
              htmlFor="categoryDescription"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Description
            </label>
            <textarea
              id="categoryDescription"
              rows={4}
              disabled={isView}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50"
              {...register("description")}
            />
            {errors.description?.message && (
              <p className="mt-1.5 text-xs font-medium text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          <label
            className={[
              "flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3",
              isView ? "cursor-default" : "cursor-pointer",
            ].join(" ")}
          >
            <span>
              <span className="block text-sm font-semibold text-slate-900">
                Active category
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Active categories can be assigned to inventory items.
              </span>
            </span>
            <input
              type="checkbox"
              disabled={isView}
              className="h-4 w-4 accent-brand"
              {...register("isActive")}
            />
          </label>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <AppButton variant="secondary" onClick={onClose}>
              {isView ? "Close" : "Cancel"}
            </AppButton>
            {!isView && (
              <AppButton type="submit" isLoading={isSubmitting}>
                {isEdit ? "Save Changes" : "Create Category"}
              </AppButton>
            )}
          </div>
        </form>
      )}
    </AppModal>
  );
};

export default CategoryFormModal;
