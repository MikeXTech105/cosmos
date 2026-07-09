import {
  AlertCircle,
  Image as ImageIcon,
  ImageUp,
  LoaderCircle,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

import { uploadService } from "../../services/uploadService";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const validateFile = (file) => {
  if (!file) {
    return "Choose an image to upload.";
  }

  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return "Upload a PNG, JPG, or WebP image.";
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return "Image must be 5MB or smaller.";
  }

  return "";
};

const AppImageUpload = ({
  disabled = false,
  error,
  label,
  onChange,
  onFileChange,
  value,
}) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [failedPreviewUrl, setFailedPreviewUrl] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const isDisabled = disabled || isUploading;
  const currentError = uploadError || error;
  const previewError = Boolean(value) && failedPreviewUrl === value;

  const openFilePicker = () => {
    if (!isDisabled) {
      inputRef.current?.click();
    }
  };

  const handleFile = async (file) => {
    const validationError = validateFile(file);

    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setUploadError("");

    try {
      const imageUrl = await uploadService.uploadImage(file, (event) => {
        if (!event.total) {
          return;
        }

        setProgress(Math.round((event.loaded * 100) / event.total));
      });

      onChange?.(imageUrl);
      onFileChange?.(file);
      setProgress(100);
    } catch (uploadErrorResponse) {
      setUploadError(
        uploadErrorResponse?.message ?? "Unable to upload image.",
      );
    } finally {
      setIsUploading(false);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleInputChange = (event) => {
    void handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    if (!isDisabled) {
      void handleFile(event.dataTransfer.files?.[0]);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();

    if (!isDisabled) {
      setIsDragging(true);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  };

  const clearImage = (event) => {
    event.stopPropagation();
    setUploadError("");
    setFailedPreviewUrl("");
    onChange?.("");
    onFileChange?.(null);
  };

  return (
    <div>
      {label && (
        <p className="mb-1.5 text-xs font-semibold text-slate-700">
          {label}
        </p>
      )}

      <div
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-disabled={isDisabled}
        onClick={openFilePicker}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onKeyDown={handleKeyDown}
        className={twMerge(
          "relative flex min-h-36 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center transition-colors hover:border-brand/40 hover:bg-slate-50",
          isDragging ? "border-brand/60 bg-slate-50" : "",
          isDisabled ? "cursor-not-allowed opacity-70" : "",
          currentError ? "border-red-300" : "",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={isDisabled}
          onChange={handleInputChange}
          className="hidden"
        />

        {value && !previewError ? (
          <div className="flex w-full items-center gap-4 text-left">
            <img
              src={value}
              alt=""
              onError={() => setFailedPreviewUrl(value)}
              className="h-24 w-24 shrink-0 rounded-lg border border-slate-200 object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                Item image selected
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Click or drop another image to replace it.
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand">
                <Upload className="h-3.5 w-3.5" />
                Replace
              </span>
            </div>
            <button
              type="button"
              disabled={isUploading}
              onClick={clearImage}
              className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Remove item image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-light text-brand">
              {previewError ? (
                <ImageIcon className="h-5 w-5" />
              ) : (
                <ImageUp className="h-5 w-5" />
              )}
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              Click to upload or drag & drop
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              PNG, JPG, or WebP up to 5MB
            </p>
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white px-6">
            <LoaderCircle className="h-5 w-5 animate-spin text-brand" />
            <p className="mt-3 text-sm font-semibold text-slate-900">
              Uploading image
            </p>
            <progress
              value={progress}
              max="100"
              className="mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full accent-brand"
            />
            <p className="mt-2 text-xs font-medium text-slate-500">
              {progress}%
            </p>
          </div>
        )}
      </div>

      {currentError && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {currentError}
        </p>
      )}
    </div>
  );
};

export default AppImageUpload;
