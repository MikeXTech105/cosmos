import { zodResolver } from "@hookform/resolvers/zod";
import { FileText } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import AppButton from "../../../components/common/AppButton";
import AppImageUpload from "../../../components/common/AppImageUpload";
import AppInput from "../../../components/common/AppInput";
import AppModal from "../../../components/common/AppModal";
import { hrDocumentSchema } from "../../../utils/validationSchemas";

const defaultValues = {
  documentType: "",
  expiryDate: "",
  fileName: "",
  filePath: "",
};

const EmployeeDocumentModal = ({ isOpen, onClose, onSubmit }) => {
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm({
    resolver: zodResolver(hrDocumentSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      reset(defaultValues);
    }
  }, [isOpen, reset]);

  const submitForm = async (values) => {
    await onSubmit({
      documentType: values.documentType.trim(),
      fileName: values.fileName.trim(),
      filePath: values.filePath.trim(),
      expiryDate: values.expiryDate || null,
    });
  };

  return (
    <AppModal
      isBusy={isSubmitting}
      isOpen={isOpen}
      maxWidth="max-w-xl"
      onClose={isSubmitting ? undefined : onClose}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
          <FileText aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Add Document
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Upload a document image and save the backend document record.
          </p>
        </div>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit(submitForm)}>
        <div className="grid gap-4 md:grid-cols-2">
          <AppInput
            id="documentType"
            label="Document Type"
            required
            placeholder="Aadhaar, PAN, Contract..."
            error={errors.documentType?.message}
            {...register("documentType")}
          />
          <AppInput
            id="fileName"
            label="File Name"
            required
            error={errors.fileName?.message}
            {...register("fileName")}
          />
        </div>

        <AppInput
          id="expiryDate"
          label="Expiry Date"
          type="date"
          error={errors.expiryDate?.message}
          {...register("expiryDate")}
        />

        <Controller
          name="filePath"
          control={control}
          render={({ field }) => (
            <AppImageUpload
              label="Document File"
              value={field.value}
              onChange={field.onChange}
              error={errors.filePath?.message}
            />
          )}
        />

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" isLoading={isSubmitting} loadingText="Uploading…">
            Save Document
          </AppButton>
        </div>
      </form>
    </AppModal>
  );
};

export default EmployeeDocumentModal;
