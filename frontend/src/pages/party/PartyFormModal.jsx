import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Contact,
  LoaderCircle,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";

import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import { getGstStateName } from "../../constants/gstStateCodes";
import {
  clearGstVerification,
  fetchGstConfigStatus,
  markGstVerificationStale,
  verifyGstin as verifyGstinThunk,
} from "../../store/slices/party/gstSlice";
import { getApiErrorMessage } from "../../utils/apiError";
import { applyApiErrorsToForm } from "../../utils/formApiErrors";
import {
  PARTY_COMMAND_FIELDS,
  PARTY_FIELD_SECTIONS,
} from "./partyColumns";
import {
  buildApiPayload,
  buildFormValues,
  formatDate,
  getFieldLabel,
} from "./partyHelpers";

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

const GSTIN_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const GSTIN_MAX_LENGTH = 15;

const normalizeGstin = (value) => {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, GSTIN_MAX_LENGTH);
};

const isValidGstin = (value) => {
  const gstin = normalizeGstin(value);

  return GSTIN_PATTERN.test(gstin);
};

const isEmptyFormValue = (value) => {
  return value === undefined || value === null || String(value).trim() === "";
};

const getSectionTitle = (section, hasGstinField) => {
  if (hasGstinField && section.id === "basic") {
    return "GSTIN / Basic";
  }

  return section.title;
};

const isTextareaField = (name) => {
  return /address|message/i.test(name);
};

const normalizeNumberInput = (rawValue, { integer = false } = {}) => {
  const value = String(rawValue ?? "").replace(integer ? /\D/g : /[^\d.]/g, "");

  if (!value) {
    return "";
  }

  if (integer) {
    return value.replace(/^0+(?=\d)/, "") || "0";
  }

  const decimalIndex = value.indexOf(".");

  if (decimalIndex >= 0) {
    const integerPart =
      value.slice(0, decimalIndex).replace(/^0+(?=\d)/, "") || "0";
    const decimalPart = value.slice(decimalIndex + 1).replace(/\./g, "");

    return `${integerPart}.${decimalPart}`;
  }

  return value.replace(/^0+(?=\d)/, "") || "0";
};

const normalizeNumberBlurValue = (value, options) => {
  const normalized = normalizeNumberInput(value, options);

  if (!normalized) {
    return "0";
  }

  const completedValue = normalized.endsWith(".")
    ? normalized.slice(0, -1)
    : normalized;
  const numberValue = Number(completedValue);

  return Number.isFinite(numberValue) ? String(numberValue) : "0";
};

const toDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
};

const pickFirstString = (...values) => {
  const value = values.find((item) => {
    return typeof item === "string" && item.trim();
  });

  return value?.trim() ?? "";
};

const joinAddressParts = (...parts) => {
  return parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(", ");
};

const parseJsonValue = (value, label) => {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    const parsed = JSON.parse(value);

    if (typeof parsed === "string") {
      return parseJsonValue(parsed, label);
    }

    return parsed;
  } catch (error) {
    console.warn(`Unable to parse GSTIN ${label}.`, error);
    return null;
  }
};

const getAddressNode = (addressJson) => {
  const parsed = parseJsonValue(addressJson, "addressJson");

  if (!parsed || typeof parsed !== "object") {
    return { node: null, parsed: null, rawAddress: "" };
  }

  const candidates = [
    parsed?.pradr?.addr,
    parsed?.principalPlaceOfBusiness?.address,
    parsed?.principalPlaceOfBusiness?.addr,
    parsed?.principalPlaceOfBusiness,
    parsed?.address,
    parsed?.addr,
    parsed,
  ];

  return {
    node:
      candidates.find((candidate) => {
        return candidate && typeof candidate === "object";
      }) ?? null,
    parsed,
    rawAddress: pickFirstString(
      parsed?.pradr?.adr,
      parsed?.principalPlaceOfBusiness?.adr,
      parsed?.principalPlaceOfBusiness?.addressString,
      parsed?.addressString,
      parsed?.adr,
    ),
  };
};

const splitRawAddress = (rawAddress) => {
  return rawAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
};

const parseGstAddress = (addressJson, stateCode) => {
  const { node, parsed, rawAddress } = getAddressNode(addressJson);
  const resolvedStateName = getGstStateName(stateCode);

  if (!node) {
    return {};
  }

  const line1 = joinAddressParts(
    node.bno,
    node.buildingNo,
    node.doorNo,
    node.flno,
    node.floorNo,
    node.bnm,
    node.buildingName,
    node.bldgName,
  );
  const line2 = joinAddressParts(
    node.st,
    node.street,
    node.streetName,
    node.loc,
    node.locality,
    node.landMark,
    node.landmark,
  );
  const rawParts = splitRawAddress(rawAddress);
  const address = {
    line1: line1 || rawParts.slice(0, 2).join(", "),
    line2: line2 || rawParts.slice(2, 5).join(", "),
    city: pickFirstString(
      node.city,
      node.town,
      node.dst,
      node.district,
      node.loc,
      rawParts.at(-3),
    ),
    state:
      resolvedStateName ||
      pickFirstString(node.stcd, node.state, node.stateName, rawParts.at(-2)),
    pincode: pickFirstString(
      node.pncd,
      node.pincode,
      node.pinCode,
      node.postalCode,
      node.pin,
      rawParts.at(-1),
    ).replace(/\D/g, ""),
  };

  if (
    !address.line1 &&
    !address.line2 &&
    !address.city &&
    !address.state &&
    !address.pincode
  ) {
    console.warn("GSTIN addressJson shape was not recognized.", parsed);
  }

  return address;
};

const maybeSetAutoFillValue = (payload, fieldNames, fieldName, value) => {
  if (!fieldNames.has(fieldName) || isEmptyFormValue(value)) {
    return;
  }

  payload[fieldName] = value;
};

const buildGstAutoFillValues = (data, fields) => {
  const fieldNames = new Set(fields.map((field) => field.name));
  const address = parseGstAddress(data?.addressJson, data?.stateCode);
  const stateName = getGstStateName(data?.stateCode) || data?.stateCode || "";
  const values = {};
  const displayName = data?.tradeName || data?.legalName || "";

  maybeSetAutoFillValue(values, fieldNames, "legalName", data?.legalName);
  maybeSetAutoFillValue(values, fieldNames, "tradeName", data?.tradeName);
  maybeSetAutoFillValue(values, fieldNames, "partyName", displayName);
  maybeSetAutoFillValue(values, fieldNames, "gstin", data?.gstin);
  maybeSetAutoFillValue(values, fieldNames, "state", stateName);
  maybeSetAutoFillValue(values, fieldNames, "stateCode", data?.stateCode);
  maybeSetAutoFillValue(
    values,
    fieldNames,
    "gstRegistrationDate",
    toDateInputValue(data?.registrationDate),
  );
  maybeSetAutoFillValue(
    values,
    fieldNames,
    "registrationDate",
    toDateInputValue(data?.registrationDate),
  );
  maybeSetAutoFillValue(values, fieldNames, "taxpayerType", data?.taxpayerType);
  maybeSetAutoFillValue(values, fieldNames, "gstStatus", data?.status);
  maybeSetAutoFillValue(values, fieldNames, "status", data?.status);

  maybeSetAutoFillValue(
    values,
    fieldNames,
    "billingAddressLine1",
    address.line1,
  );
  maybeSetAutoFillValue(
    values,
    fieldNames,
    "billingAddressLine2",
    address.line2,
  );
  maybeSetAutoFillValue(values, fieldNames, "billingCity", address.city);
  maybeSetAutoFillValue(values, fieldNames, "billingState", address.state);
  maybeSetAutoFillValue(values, fieldNames, "billingPincode", address.pincode);
  maybeSetAutoFillValue(values, fieldNames, "billingCountry", "India");

  maybeSetAutoFillValue(
    values,
    fieldNames,
    "shippingAddressLine1",
    address.line1,
  );
  maybeSetAutoFillValue(
    values,
    fieldNames,
    "shippingAddressLine2",
    address.line2,
  );
  maybeSetAutoFillValue(values, fieldNames, "shippingCity", address.city);
  maybeSetAutoFillValue(values, fieldNames, "shippingState", address.state);
  maybeSetAutoFillValue(values, fieldNames, "shippingPincode", address.pincode);
  maybeSetAutoFillValue(values, fieldNames, "shippingCountry", "India");

  return values;
};

const isActiveGstStatus = (status) => {
  return String(status ?? "").trim().toLowerCase() === "active";
};

const getStatusPillClassName = (status) => {
  const normalizedStatus = String(status ?? "").trim().toLowerCase();

  if (normalizedStatus === "active") {
    return "border-green-200 bg-green-100 text-green-700";
  }

  if (/cancel|suspend|inactive/.test(normalizedStatus)) {
    return "border-red-200 bg-red-100 text-red-700";
  }

  return "border-amber-200 bg-amber-100 text-amber-700";
};

const FieldInput = ({ disabled, error, field, onChange, value }) => {
  const label = getFieldLabel(field.name);

  if (field.type === "boolean") {
    return (
      <div className="sm:col-span-2">
        <label
          className={[
            "flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3",
            disabled ? "cursor-default" : "cursor-pointer",
          ].join(" ")}
        >
          <span className="block text-sm font-semibold text-slate-900">{label}</span>
          <input
            type="checkbox"
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(event) => onChange(field.name, event.target.checked)}
            className="h-4 w-4 accent-brand"
          />
        </label>
        {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
      </div>
    );
  }

  const isNumber = field.type === "integer" || field.type === "number";
  const commonProps = {
    id: field.name,
    disabled,
    value: value ?? "",
    onChange: (event) => onChange(field.name, event.target.value),
  };

  if (isTextareaField(field.name)) {
    return (
      <div className="sm:col-span-2">
        <label
          htmlFor={field.name}
          className="mb-1.5 block text-xs font-semibold text-slate-700"
        >
          {label}
        </label>
        <textarea
          {...commonProps}
          rows={3}
          className={`${inputClassName} h-auto min-h-24 resize-y py-3`}
        />
        {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <AppInput
      {...commonProps}
      label={label}
      type="text"
      inputMode={
        isNumber ? (field.type === "integer" ? "numeric" : "decimal") : undefined
      }
      className="h-10"
      error={error}
      onFocus={(event) => {
        if (isNumber && String(value) === "0") {
          event.target.select();
        }
      }}
      onKeyDown={(event) => {
        if (isNumber && ["e", "E", "+", "-"].includes(event.key)) {
          event.preventDefault();
        }
      }}
      onChange={
        isNumber
          ? (event) =>
              onChange(
                field.name,
                normalizeNumberInput(event.target.value, {
                  integer: field.type === "integer",
                }),
              )
          : commonProps.onChange
      }
      onBlur={
        isNumber
          ? (event) =>
              onChange(
                field.name,
                normalizeNumberBlurValue(event.target.value, {
                  integer: field.type === "integer",
                }),
              )
          : undefined
      }
    />
  );
};

const StatusPill = ({ status }) => {
  if (!status) {
    return null;
  }

  return (
    <span
      className={[
        "inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-semibold",
        getStatusPillClassName(status),
      ].join(" ")}
    >
      {status}
    </span>
  );
};

const VerifiedGstinBanner = ({
  data,
  disabled,
  isEditMode,
  isVerifying,
  onApply,
  onReverify,
}) => {
  if (!data) {
    return null;
  }

  const stateName = getGstStateName(data.stateCode);
  const verifiedAt = data.verifiedAt ? formatDate(data.verifiedAt) : "";
  const providerText = [data.providerName, verifiedAt]
    .filter(Boolean)
    .join(" - ");

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-green-950">
                GSTIN Verified
              </p>
              <StatusPill status={data.status} />
            </div>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-green-700">
                  Legal Name
                </dt>
                <dd className="mt-1 text-green-950">
                  {data.legalName || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-green-700">
                  Trade Name
                </dt>
                <dd className="mt-1 text-green-950">
                  {data.tradeName || data.legalName || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-green-700">
                  Taxpayer Type
                </dt>
                <dd className="mt-1 text-green-950">
                  {data.taxpayerType || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-green-700">
                  State Code
                </dt>
                <dd className="mt-1 text-green-950">
                  {[data.stateCode, stateName].filter(Boolean).join(" - ") ||
                    "-"}
                </dd>
              </div>
            </dl>
            {providerText && (
              <p className="mt-3 text-xs font-medium text-green-700">
                Verified via {providerText}
              </p>
            )}
            {!isActiveGstStatus(data.status) && data.status && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                This GSTIN is {data.status} - please confirm before saving.
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {isEditMode && !disabled && (
            <AppButton
              type="button"
              variant="secondary"
              className="h-8 rounded-lg px-3 text-xs"
              onClick={onApply}
            >
              Apply fetched details
            </AppButton>
          )}
          {!disabled && (
            <button
              type="button"
              onClick={onReverify}
              disabled={isVerifying}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isVerifying ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              Re-verify
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const GstinEntryPanel = ({
  config,
  disabled,
  error,
  isValid,
  isVerifying,
  onChange,
  onSkip,
  onVerify,
  value,
}) => {
  const canVerify = config.available && !disabled;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <AppInput
            id="gstin"
            label="GSTIN"
            value={value}
            maxLength={GSTIN_MAX_LENGTH}
            disabled={disabled}
            placeholder="24ABCDE1234F1Z5"
            className="h-11 uppercase tracking-[0.08em]"
            error={error}
            onChange={(event) => onChange(event.target.value)}
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-xs text-slate-500">
              Enter GSTIN to auto-fill party details
            </p>
            {!disabled && (
              <button
                type="button"
                onClick={onSkip}
                className="text-xs font-semibold text-brand transition-colors hover:text-brand-dark"
              >
                Skip - enter details manually
              </button>
            )}
          </div>
        </div>

        {canVerify && (
          <AppButton
            type="button"
            className="h-11 shrink-0 rounded-lg px-4"
            disabled={!isValid || isVerifying}
            onClick={() => onVerify({ forceRefresh: false })}
          >
            {isVerifying ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                Verify
              </>
            )}
          </AppButton>
        )}
      </div>

      {!canVerify && !disabled && config.loaded && (
        <p className="mt-3 text-xs font-medium text-slate-500">
          GST verification is unavailable. Enter party details manually.
        </p>
      )}
      {config.loading && (
        <p className="mt-3 text-xs font-medium text-slate-500">
          Checking GST verification availability...
        </p>
      )}
    </div>
  );
};

const GstTaxSummary = ({ gstin, verifiedData }) => {
  const stateName = getGstStateName(verifiedData?.stateCode);
  const registrationDate = verifiedData?.registrationDate
    ? formatDate(verifiedData.registrationDate)
    : "";
  const hasVerifiedDetails = Boolean(verifiedData);

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
            Synced GSTIN
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {gstin || "Not entered"}
          </p>
        </div>
        {verifiedData?.status && <StatusPill status={verifiedData.status} />}
      </div>

      {hasVerifiedDetails && (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold text-slate-500">Taxpayer</dt>
            <dd className="mt-1 text-slate-900">
              {verifiedData.taxpayerType || "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">
              Registration
            </dt>
            <dd className="mt-1 text-slate-900">{registrationDate || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">State</dt>
            <dd className="mt-1 text-slate-900">
              {[verifiedData.stateCode, stateName].filter(Boolean).join(" - ") ||
                "-"}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
};

const ModalSkeleton = ({ count = 8 }) => {
  return (
    <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6 sm:py-6">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  );
};

const PartyFormContent = ({
  fields,
  groupedFields,
  isView,
  mode,
  onClose,
  onSubmit,
  source,
  submitLabel,
}) => {
  const dispatch = useDispatch();
  const gstState = useSelector((state) => state.partyGst);
  const gstConfig = gstState?.config ?? {};
  const gstVerify = gstState?.verify ?? {};
  const firstSectionId = groupedFields[0]?.id;
  const [activeSectionId, setActiveSectionId] = useState(firstSectionId);
  const [values, setValues] = useState(() => buildFormValues(fields, source));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiErrors, setApiErrors] = useState({});
  const [verifiedGstinData, setVerifiedGstinData] = useState(null);
  const [gstinError, setGstinError] = useState("");
  const autoFilledValuesRef = useRef({});
  const configLoggedRef = useRef(false);
  const hasGstinField = useMemo(() => {
    return fields.some((field) => field.name === "gstin");
  }, [fields]);
  const isEditMode = mode === "edit";
  const activeSection =
    groupedFields.find((section) => section.id === activeSectionId) ??
    groupedFields[0];
  const activeSectionIndex = Math.max(
    0,
    groupedFields.findIndex((section) => section.id === activeSection?.id),
  );
  const isLastSection = activeSectionIndex === groupedFields.length - 1;
  const normalizedGstin = normalizeGstin(values.gstin);
  const hasGstinValue = Boolean(normalizedGstin);
  const gstinIsValid = isValidGstin(normalizedGstin);
  const visibleGstinError =
    gstinError ||
    (hasGstinValue && !gstinIsValid
      ? "Enter a valid 15-character GSTIN."
      : "");
  const gstConfigView = {
    available: Boolean(gstConfig.loaded && gstConfig.available),
    loaded: Boolean(gstConfig.loaded),
    loading: Boolean(gstConfig.loading),
  };

  useEffect(() => {
    if (!hasGstinField || gstConfig.loaded || gstConfig.loading) {
      return;
    }

    void dispatch(fetchGstConfigStatus());
  }, [
    dispatch,
    gstConfig.loaded,
    gstConfig.loading,
    hasGstinField,
  ]);

  useEffect(() => {
    if (
      !hasGstinField ||
      !gstConfig.loaded ||
      gstConfig.available ||
      configLoggedRef.current
    ) {
      return;
    }

    console.info("GST verification is unavailable.", {
      error: gstConfig.error,
      missingSettings: gstConfig.missingSettings,
    });
    configLoggedRef.current = true;
  }, [
    gstConfig.available,
    gstConfig.error,
    gstConfig.loaded,
    gstConfig.missingSettings,
    hasGstinField,
  ]);

  const applyFetchedDetails = useCallback(
    (data, { force = false } = {}) => {
      const autoFillValues = buildGstAutoFillValues(data, fields);

      setValues((current) => {
        const nextValues = { ...current };
        const appliedValues = {};

        Object.entries(autoFillValues).forEach(([fieldName, nextValue]) => {
          const currentValue = nextValues[fieldName];
          const previousAutoValue = autoFilledValuesRef.current[fieldName];
          const canApply =
            force ||
            isEmptyFormValue(currentValue) ||
            String(currentValue ?? "") === String(previousAutoValue ?? "");

          if (canApply) {
            nextValues[fieldName] = nextValue;
            appliedValues[fieldName] = nextValue;
          }
        });

        autoFilledValuesRef.current = {
          ...autoFilledValuesRef.current,
          ...appliedValues,
        };

        return nextValues;
      });
    },
    [fields],
  );

  const handleFieldChange = useCallback(
    (fieldName, value) => {
      const nextValue = fieldName === "gstin" ? normalizeGstin(value) : value;

      setValues((current) => ({
        ...current,
        [fieldName]: nextValue,
      }));
      setApiErrors((current) => ({
        ...current,
        [fieldName]: undefined,
        "root.server": undefined,
      }));

      if (fieldName !== "gstin") {
        return;
      }

      setGstinError("");

      if (
        verifiedGstinData &&
        normalizeGstin(verifiedGstinData.gstin) !== nextValue
      ) {
        setVerifiedGstinData(null);
        autoFilledValuesRef.current = {};
        dispatch(markGstVerificationStale(nextValue));
      }
    },
    [dispatch, verifiedGstinData],
  );

  const handleVerifyGstin = useCallback(
    async ({ forceRefresh = false } = {}) => {
      if (gstVerify.loading) {
        return;
      }

      if (!gstinIsValid) {
        setGstinError("Enter a valid 15-character GSTIN.");
        return;
      }

      setGstinError("");

      try {
        const response = await dispatch(
          verifyGstinThunk({
            forceRefresh,
            gstin: normalizedGstin,
          }),
        ).unwrap();
        const data = response?.data;

        if (!data) {
          throw new Error("GSTIN verification did not return details.");
        }

        setVerifiedGstinData(data);

        if (isEditMode) {
          toast.success("GSTIN verified - review fetched details");
        } else {
          applyFetchedDetails(data);
          toast.success("GSTIN verified - details auto-filled");
        }
      } catch (error) {
        const message = getApiErrorMessage(
          error,
          "Unable to verify GSTIN.",
        );

        setGstinError(message);
        toast.error(message);
      }
    },
    [
      applyFetchedDetails,
      dispatch,
      gstVerify.loading,
      gstinIsValid,
      isEditMode,
      normalizedGstin,
    ],
  );

  const handleApplyFetchedDetails = useCallback(() => {
    if (!verifiedGstinData) {
      return;
    }

    applyFetchedDetails(verifiedGstinData, { force: true });
    toast.success("Fetched GSTIN details applied");
  }, [applyFetchedDetails, verifiedGstinData]);

  const handleSkipGstin = useCallback(() => {
    setGstinError("");
    dispatch(clearGstVerification());
  }, [dispatch]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isView) {
      return;
    }

    if (hasGstinField && hasGstinValue && !gstinIsValid) {
      setGstinError("Enter a valid 15-character GSTIN.");
      setActiveSectionId("basic");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(buildApiPayload(fields, values));
    } catch (error) {
      applyApiErrorsToForm({
        error,
        formFieldNames: fields.map((field) => field.name),
        setError: (name, detail) => {
          setApiErrors((current) => ({ ...current, [name]: detail.message }));
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {apiErrors["root.server"] && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {apiErrors["root.server"]}
          </p>
        )}
        <div className="sticky top-0 z-10 -mx-5 mb-5 border-b border-slate-200 bg-white px-5 pb-0 sm:-mx-6 sm:px-6">
          <div className="flex overflow-x-auto">
            {groupedFields.map((section, index) => {
              const isActive = section.id === activeSection?.id;
              const isComplete = index < activeSectionIndex;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSectionId(section.id)}
                  className={[
                    "relative flex h-12 shrink-0 items-center gap-2 px-3 text-xs font-semibold transition-colors",
                    isActive
                      ? "text-brand"
                      : "text-slate-500 hover:text-slate-900",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                      isActive
                        ? "bg-brand text-white"
                        : isComplete
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-500",
                    ].join(" ")}
                  >
                    {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span>{getSectionTitle(section, hasGstinField)}</span>
                  {isActive && (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 bg-brand" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeSection && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
              {getSectionTitle(activeSection, hasGstinField)}
            </h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {hasGstinField && activeSection.id === "basic" && (
                <>
                  <GstinEntryPanel
                    config={gstConfigView}
                    disabled={isView}
                    error={visibleGstinError}
                    isValid={gstinIsValid}
                    isVerifying={Boolean(gstVerify.loading)}
                    value={normalizedGstin}
                    onChange={(value) => handleFieldChange("gstin", value)}
                    onSkip={handleSkipGstin}
                    onVerify={handleVerifyGstin}
                  />
                  {verifiedGstinData && (
                    <div className="sm:col-span-2">
                      <VerifiedGstinBanner
                        data={verifiedGstinData}
                        disabled={isView}
                        isEditMode={isEditMode}
                        isVerifying={Boolean(gstVerify.loading)}
                        onApply={handleApplyFetchedDetails}
                        onReverify={() =>
                          handleVerifyGstin({ forceRefresh: true })
                        }
                      />
                    </div>
                  )}
                </>
              )}

              {hasGstinField && activeSection.id === "gst" && (
                <GstTaxSummary
                  gstin={normalizedGstin}
                  verifiedData={verifiedGstinData}
                />
              )}

              {activeSection.fields
                .filter((field) => !(hasGstinField && field.name === "gstin"))
                .map((field) => (
                  <FieldInput
                    key={field.name}
                    disabled={isView}
                    error={apiErrors[field.name]}
                    field={field}
                    onChange={handleFieldChange}
                    value={values[field.name]}
                  />
                ))}
            </div>
          </section>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs font-medium text-slate-400">
          Step {activeSectionIndex + 1} of {groupedFields.length}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
          >
            {isView ? "Close" : "Cancel"}
          </button>
          {!isView && (
            <button
              type={isLastSection ? "submit" : "button"}
              onClick={
                isLastSection
                  ? undefined
                  : () =>
                      setActiveSectionId(
                        groupedFields[activeSectionIndex + 1]?.id,
                      )
              }
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting
                ? "Saving..."
                : isLastSection
                  ? submitLabel ?? "Save"
                  : "Next"}
              {isLastSection ? (
                <Check className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  );
};

const PartyFormModal = ({
  description,
  fields = PARTY_COMMAND_FIELDS,
  icon = "party",
  isLoading,
  isOpen,
  mode = "create",
  onClose,
  onSubmit,
  sections = PARTY_FIELD_SECTIONS,
  source,
  submitLabel,
  title,
}) => {
  const isView = mode === "view";
  const groupedFields = useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        fields: fields.filter((field) => field.section === section.id),
      }))
      .filter((section) => section.fields.length > 0);
  }, [fields, sections]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const Icon = icon === "settings" ? Settings : Contact;
  const formKey = `${mode}:${source?.id ?? "new"}:${fields
    .map((field) => field.name)
    .join("|")}`;

  const modalTitle =
    title ?? (mode === "edit" ? "Edit Party" : mode === "view" ? "View Party" : "Add Party");
  const modalDescription =
    description ??
    (mode === "edit"
      ? "Update Party details."
      : mode === "view"
        ? "Review Party details."
        : "Create a Party record.");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="party-modal-title"
            className="flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:max-h-[calc(100dvh-3rem)]"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="party-modal-title"
                    className="text-lg font-bold tracking-tight text-slate-950"
                  >
                    {modalTitle}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {modalDescription}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close party modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isLoading ? (
              <ModalSkeleton count={fields.length} />
            ) : (
              <PartyFormContent
                key={formKey}
                fields={fields}
                groupedFields={groupedFields}
                isView={isView}
                mode={mode}
                source={source}
                submitLabel={submitLabel}
                onClose={onClose}
                onSubmit={onSubmit}
              />
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default memo(PartyFormModal);
