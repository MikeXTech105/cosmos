import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Contact,
  LoaderCircle,
  MapPin,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  ToggleRight,
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
import AppSelect from "../../components/common/AppSelect";
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
  clearFormDraft,
  readFormDraft,
  saveFormDraft,
} from "../../utils/formDraftStorage";
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

const REQUIRED_PARTY_FIELDS = new Set(["partyCode", "partyName"]);

const GST_TREATMENT_OPTIONS = [
  { label: "Unregistered", value: 0 },
  { label: "Registered - Regular", value: 1 },
  { label: "Registered - Composition", value: 2 },
  { label: "Consumer", value: 3 },
  { label: "Overseas", value: 4 },
  { label: "Special Economic Zone", value: 5 },
  { label: "Deemed Export", value: 6 },
];

const OPENING_BALANCE_TYPE_OPTIONS = [
  { label: "Debit (receivable)", value: 0 },
  { label: "Credit (payable)", value: 1 },
];

const FIELD_OPTIONS = {
  gstTreatment: GST_TREATMENT_OPTIONS,
  openingBalanceType: OPENING_BALANCE_TYPE_OPTIONS,
};

const FIELD_HELPERS = {
  partyCode: "Your internal unique code for this party.",
  gstTreatment: "How GST should be applied to this party.",
  openingBalance: "Balance carried forward when this party is created.",
  creditLimit: "Maximum outstanding amount allowed. Use 0 for no limit.",
  creditPeriodDays: "Number of days allowed before payment is due.",
};

const FIELD_MAX_LENGTHS = {
  partyCode: 50,
  partyName: 200,
  mobileNo: 20,
  email: 200,
  legalName: 250,
  tradeName: 250,
  billingAddressLine1: 250,
  billingAddressLine2: 250,
  billingCity: 100,
  billingState: 100,
  billingCountry: 100,
  billingPincode: 20,
  shippingAddressLine1: 250,
  shippingAddressLine2: 250,
  shippingCity: 100,
  shippingState: 100,
  shippingCountry: 100,
  shippingPincode: 20,
};

const SECTION_META = {
  basic: {
    description: "Identity and contact details",
    icon: Building2,
  },
  gst: {
    description: "Tax registration and compliance",
    icon: ReceiptText,
  },
  address: {
    description: "Billing and delivery locations",
    icon: MapPin,
  },
  credit: {
    description: "Opening balance and payment terms",
    icon: CircleDollarSign,
  },
  additional: {
    description: "Availability of this party record",
    icon: ToggleRight,
  },
};

const ADDRESS_FIELD_PAIRS = {
  billingAddressLine1: "shippingAddressLine1",
  billingAddressLine2: "shippingAddressLine2",
  billingCity: "shippingCity",
  billingState: "shippingState",
  billingCountry: "shippingCountry",
  billingPincode: "shippingPincode",
};

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

const getGstTreatmentFromTaxpayerType = (taxpayerType) => {
  const normalizedType = String(taxpayerType ?? "").trim().toLowerCase();

  if (!normalizedType) {
    return null;
  }

  if (normalizedType.includes("composition")) {
    return 2;
  }

  if (
    normalizedType.includes("regular") ||
    normalizedType.includes("taxpayer") ||
    normalizedType.includes("casual")
  ) {
    return 1;
  }

  if (normalizedType.includes("consumer")) {
    return 3;
  }

  if (normalizedType.includes("overseas")) {
    return 4;
  }

  if (normalizedType.includes("sez") || normalizedType.includes("economic zone")) {
    return 5;
  }

  if (normalizedType.includes("deemed")) {
    return 6;
  }

  return null;
};

const getSectionTitle = (section) => section.title;

const isTextareaField = (name) => {
  return /message/i.test(name);
};

const getInitialShippingSameAsBilling = (values) => {
  const populatedPairs = Object.entries(ADDRESS_FIELD_PAIRS).filter(
    ([billingField, shippingField]) =>
      !isEmptyFormValue(values[billingField]) ||
      !isEmptyFormValue(values[shippingField]),
  );

  if (populatedPairs.length === 0) {
    return true;
  }

  return populatedPairs.every(
    ([billingField, shippingField]) =>
      String(values[billingField] ?? "").trim() ===
      String(values[shippingField] ?? "").trim(),
  );
};

const copyBillingAddress = (values) => {
  return Object.entries(ADDRESS_FIELD_PAIRS).reduce(
    (nextValues, [billingField, shippingField]) => {
      nextValues[shippingField] = nextValues[billingField];
      return nextValues;
    },
    { ...values },
  );
};

const validatePartyValues = (fields, values, { validateGstin = false } = {}) => {
  const fieldNames = new Set(fields.map((field) => field.name));
  const errors = {};
  const getTrimmedValue = (name) => String(values[name] ?? "").trim();

  if (fieldNames.has("partyCode") && !getTrimmedValue("partyCode")) {
    errors.partyCode = "Party code is required.";
  }

  if (fieldNames.has("partyName") && !getTrimmedValue("partyName")) {
    errors.partyName = "Party name is required.";
  }

  const email = getTrimmedValue("email");
  if (fieldNames.has("email") && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  const mobileDigits = getTrimmedValue("mobileNo").replace(/\D/g, "");
  if (
    fieldNames.has("mobileNo") &&
    mobileDigits &&
    (mobileDigits.length < 7 || mobileDigits.length > 15)
  ) {
    errors.mobileNo = "Enter a valid mobile number.";
  }

  ["openingBalance", "creditLimit", "creditPeriodDays"].forEach((fieldName) => {
    if (!fieldNames.has(fieldName)) {
      return;
    }

    const value = Number(values[fieldName]);
    if (!Number.isFinite(value) || value < 0) {
      errors[fieldName] = `${getFieldLabel(fieldName)} cannot be negative.`;
    }
  });

  ["billingPincode", "shippingPincode"].forEach((fieldName) => {
    if (!fieldNames.has(fieldName)) {
      return;
    }

    const pincode = getTrimmedValue(fieldName);
    const countryField = fieldName.replace("Pincode", "Country");
    const country = getTrimmedValue(countryField).toLowerCase();
    if (pincode && (!country || country === "india") && !/^\d{6}$/.test(pincode)) {
      errors[fieldName] = "Enter a valid 6-digit Indian pincode.";
    }
  });

  if (validateGstin) {
    const gstin = getTrimmedValue("gstin");
    if (gstin && !isValidGstin(gstin)) {
      errors.gstin = "Enter a valid 15-character GSTIN.";
    }
  }

  return errors;
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

const parseJsonValue = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    const parsed = JSON.parse(value);

    if (typeof parsed === "string") {
      return parseJsonValue(parsed);
    }

    return parsed;
  } catch {
    return null;
  }
};

const getAddressNode = (addressJson) => {
  const parsed = parseJsonValue(addressJson);

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
  const { node, rawAddress } = getAddressNode(addressJson);
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
  maybeSetAutoFillValue(
    values,
    fieldNames,
    "gstTreatment",
    getGstTreatmentFromTaxpayerType(data?.taxpayerType),
  );
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

const FieldInput = ({
  autoFilled = false,
  disabled,
  error,
  field,
  helperText,
  onChange,
  value,
}) => {
  const label = getFieldLabel(field.name);
  const required = REQUIRED_PARTY_FIELDS.has(field.name);
  const resolvedHelperText = autoFilled
    ? "Filled from verified GSTIN"
    : helperText ?? FIELD_HELPERS[field.name];

  if (field.type === "boolean") {
    return (
      <div>
        <label
          className={[
            "flex min-h-16 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors",
            disabled ? "cursor-default" : "cursor-pointer",
          ].join(" ")}
        >
          <span>
            <span className="block text-sm font-semibold text-slate-900">{label}</span>
            {field.name === "isActive" && (
              <span className="mt-0.5 block text-xs text-slate-500">
                Inactive parties stay saved but cannot be used in new transactions.
              </span>
            )}
          </span>
          <span
            className={[
              "relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors",
              value ? "bg-brand" : "bg-slate-300",
            ].join(" ")}
          >
            <input
              type="checkbox"
              checked={Boolean(value)}
              disabled={disabled}
              onChange={(event) => onChange(field.name, event.target.checked)}
              className="peer sr-only"
            />
            <span
              className={[
                "pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                value ? "translate-x-5" : "translate-x-0.5",
              ].join(" ")}
            />
          </span>
        </label>
        {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
      </div>
    );
  }

  const isNumber = field.type === "integer" || field.type === "number";
  const commonProps = {
    id: field.name,
    disabled,
    maxLength: FIELD_MAX_LENGTHS[field.name],
    required,
    value: value ?? "",
    onChange: (event) => onChange(field.name, event.target.value),
  };

  const selectOptions = FIELD_OPTIONS[field.name];

  if (selectOptions) {
    return (
      <div>
        <AppSelect
          id={field.name}
          disabled={disabled}
          error={error}
          label={label}
          options={selectOptions}
          required={required}
          value={value}
          onChange={(nextValue) => onChange(field.name, nextValue)}
        />
        {resolvedHelperText && !error && (
          <p className="mt-1.5 text-xs text-slate-500">{resolvedHelperText}</p>
        )}
      </div>
    );
  }

  if (isTextareaField(field.name)) {
    return (
      <div>
        <label
          htmlFor={field.name}
          className="mb-1.5 block text-xs font-semibold text-slate-700"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        <textarea
          {...commonProps}
          rows={3}
          aria-invalid={Boolean(error) || undefined}
          className={`${inputClassName} h-auto min-h-24 resize-y py-3`}
        />
        {resolvedHelperText && !error && (
          <p className="mt-1.5 text-xs text-slate-500">{resolvedHelperText}</p>
        )}
        {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <AppInput
      {...commonProps}
      label={label}
      type="text"
      autoComplete={
        field.name === "email"
          ? "email"
          : field.name === "mobileNo"
            ? "tel"
            : undefined
      }
      inputMode={
        isNumber
          ? field.type === "integer"
            ? "numeric"
            : "decimal"
          : field.name === "email"
            ? "email"
            : field.name === "mobileNo"
              ? "tel"
              : undefined
      }
      className="h-10"
      error={error}
      helperText={resolvedHelperText}
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
  onRetryConfig,
  onSkip,
  onVerify,
  value,
}) => {
  const canVerify = config.available && !disabled;

  return (
    <section className="overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-light/70 via-white to-white shadow-sm">
      <div className="border-b border-brand/10 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-950">Start with GSTIN</h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Verify once to fill the legal name, trade name, tax type and address automatically.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <AppInput
            id="gstin"
            label="GSTIN"
            value={value}
            maxLength={GSTIN_MAX_LENGTH}
            disabled={disabled}
            placeholder="24ABCDE1234F1Z5"
            className="h-12 uppercase tracking-[0.12em]"
            error={error}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (canVerify && isValid && !isVerifying) {
                  onVerify({ forceRefresh: false });
                }
              }
            }}
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-xs text-slate-500">
              15 characters, for example 24ABCDE1234F1Z5
            </p>
            {!disabled && (
              <button
                type="button"
                onClick={onSkip}
                className="text-xs font-semibold text-brand transition-colors hover:text-brand-dark"
              >
                Enter details manually
              </button>
            )}
          </div>
        </div>

        {!disabled && (
          <AppButton
            type="button"
            className="mt-[26px] h-12 shrink-0 rounded-lg px-5"
            disabled={!canVerify || !isValid || isVerifying}
            onClick={() => onVerify({ forceRefresh: false })}
          >
            {isVerifying || config.loading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                {isVerifying ? "Verifying..." : "Checking..."}
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
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span className="font-medium">
              GST verification is unavailable. You can still enter every detail manually.
            </span>
            {onRetryConfig && (
              <button
                type="button"
                onClick={onRetryConfig}
                className="font-bold text-amber-900 underline decoration-amber-400 underline-offset-2"
              >
                Check again
              </button>
            )}
          </div>
        )}
      </div>
    </section>
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

const SectionCard = ({ children, className = "", description, icon: Icon, id, title }) => {
  return (
    <section
      id={`party-section-${id}`}
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-slate-950">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
};

const ModalSkeleton = ({ count = 8 }) => {
  return (
    <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto bg-slate-50 px-5 py-5 sm:grid-cols-2 sm:px-6 sm:py-6 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-200/70" />
      ))}
    </div>
  );
};

export const PartyFormContent = ({
  fields,
  groupedFields,
  isView,
  mode,
  onBusyChange,
  onClose,
  onSubmit,
  source,
  submitLabel,
}) => {
  const dispatch = useDispatch();
  const gstState = useSelector((state) => state.partyGst);
  const gstConfig = gstState?.config ?? {};
  const gstVerify = gstState?.verify ?? {};
  const isNewParty = mode === "create" && fields.some((field) => field.name === "gstin");
  const [values, setValues] = useState(() => {
    return (isNewParty ? readFormDraft("party-create") : null) ??
      buildFormValues(fields, source);
  });
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(() =>
    getInitialShippingSameAsBilling(buildFormValues(fields, source)),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiErrors, setApiErrors] = useState({});
  const [verifiedGstinData, setVerifiedGstinData] = useState(null);
  const [gstinError, setGstinError] = useState("");
  const [autoFilledFields, setAutoFilledFields] = useState({});
  const autoFilledValuesRef = useRef({});
  const scrollContainerRef = useRef(null);
  const hasGstinField = useMemo(() => {
    return fields.some((field) => field.name === "gstin");
  }, [fields]);
  const hasAddressFields = useMemo(() => {
    return fields.some((field) => field.name.startsWith("billing"));
  }, [fields]);
  const isEditMode = mode === "edit";
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
    onBusyChange?.(isSubmitting);

    return () => onBusyChange?.(false);
  }, [isSubmitting, onBusyChange]);

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
    return () => {
      if (hasGstinField) {
        dispatch(clearGstVerification());
      }
    };
  }, [dispatch, hasGstinField]);

  const focusField = useCallback((fieldName) => {
    window.requestAnimationFrame(() => {
      const element = document.getElementById(fieldName);

      element?.scrollIntoView({ behavior: "smooth", block: "center" });
      element?.focus?.({ preventScroll: true });
    });
  }, []);

  const applyFetchedDetails = useCallback(
    (data, { force = false } = {}) => {
      const autoFillValues = buildGstAutoFillValues(data, fields);
      const nextValues = { ...values };
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
      setAutoFilledFields((current) => ({
        ...current,
        ...Object.fromEntries(Object.keys(appliedValues).map((name) => [name, true])),
      }));
      setValues(
        shippingSameAsBilling ? copyBillingAddress(nextValues) : nextValues,
      );
    },
    [fields, shippingSameAsBilling, values],
  );

  const handleFieldChange = useCallback(
    (fieldName, value) => {
      const nextValue = fieldName === "gstin" ? normalizeGstin(value) : value;
      const mirroredShippingField = shippingSameAsBilling
        ? ADDRESS_FIELD_PAIRS[fieldName]
        : undefined;

      if (
        fieldName !== "gstin" &&
        String(autoFilledValuesRef.current[fieldName] ?? "") !== String(nextValue ?? "")
      ) {
        delete autoFilledValuesRef.current[fieldName];
        if (mirroredShippingField) {
          delete autoFilledValuesRef.current[mirroredShippingField];
        }
        setAutoFilledFields((current) => ({
          ...current,
          [fieldName]: false,
          ...(mirroredShippingField
            ? { [mirroredShippingField]: false }
            : {}),
        }));
      }

      setValues((current) => {
        const nextValues = {
          ...current,
          [fieldName]: nextValue,
        };
        if (mirroredShippingField) {
          nextValues[mirroredShippingField] = nextValue;
        }

        return nextValues;
      });
      setApiErrors((current) => ({
        ...current,
        [fieldName]: undefined,
        ...(mirroredShippingField
          ? { [mirroredShippingField]: undefined }
          : {}),
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
    [dispatch, shippingSameAsBilling, verifiedGstinData],
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

        applyFetchedDetails(data);
        toast.success(
          isEditMode
            ? "GSTIN verified - empty details were auto-filled"
            : "GSTIN verified - party details auto-filled",
        );
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
    setVerifiedGstinData(null);
    autoFilledValuesRef.current = {};
    setAutoFilledFields({});
    if (hasGstinValue && !gstinIsValid) {
      setValues((current) => ({ ...current, gstin: "" }));
    }
    dispatch(clearGstVerification());
    focusField("partyCode");
  }, [dispatch, focusField, gstinIsValid, hasGstinValue]);

  const handleRetryGstConfig = useCallback(() => {
    void dispatch(fetchGstConfigStatus());
  }, [dispatch]);

  const handleShippingAddressToggle = useCallback(() => {
    setShippingSameAsBilling((current) => {
      const nextValue = !current;

      if (nextValue) {
        setValues((currentValues) => copyBillingAddress(currentValues));
      }

      return nextValue;
    });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isView) {
      return;
    }

    const localErrors = validatePartyValues(fields, values, {
      validateGstin: hasGstinField,
    });
    const firstInvalidField = Object.keys(localErrors)[0];

    if (firstInvalidField) {
      setApiErrors(localErrors);
      setGstinError(localErrors.gstin ?? "");
      focusField(firstInvalidField);
      return;
    }

    setApiErrors({});
    setGstinError("");
    setIsSubmitting(true);

    try {
      await onSubmit(buildApiPayload(fields, values));
      if (isNewParty) {
        clearFormDraft("party-create");
      }
    } catch (error) {
      const result = applyApiErrorsToForm({
        error,
        formFieldNames: fields.map((field) => field.name),
        setError: (name, detail) => {
          setApiErrors((current) => ({ ...current, [name]: detail.message }));
        },
      });

      if (result.boundFields[0]) {
        focusField(result.boundFields[0]);
      } else {
        scrollContainerRef.current?.scrollTo({ behavior: "smooth", top: 0 });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field, options = {}) => {
    const isAutoFilled =
      Boolean(autoFilledFields[field.name]);

    return (
      <FieldInput
        autoFilled={isAutoFilled}
        disabled={isView || options.disabled}
        error={apiErrors[field.name]}
        field={field}
        helperText={options.helperText}
        onChange={handleFieldChange}
        value={values[field.name]}
      />
    );
  };

  const addressSection = groupedFields.find((section) => section.id === "address");
  const standardSections = groupedFields.filter((section) => section.id !== "address");
  const billingFields = addressSection?.fields.filter((field) =>
    field.name.startsWith("billing"),
  ) ?? [];
  const shippingFields = addressSection?.fields.filter((field) =>
    field.name.startsWith("shipping"),
  ) ?? [];

  return (
    <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={handleSubmit}>
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6 lg:px-8"
      >
        {apiErrors["root.server"] && (
          <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {apiErrors["root.server"]}
          </p>
        )}

        <div className="mx-auto max-w-[1320px] space-y-5">
          {hasGstinField && (
            <>
              <GstinEntryPanel
                config={gstConfigView}
                disabled={isView}
                error={visibleGstinError}
                isValid={gstinIsValid}
                isVerifying={Boolean(gstVerify.loading)}
                value={normalizedGstin}
                onChange={(value) => handleFieldChange("gstin", value)}
                onRetryConfig={handleRetryGstConfig}
                onSkip={handleSkipGstin}
                onVerify={handleVerifyGstin}
              />
              {verifiedGstinData && (
                <VerifiedGstinBanner
                  data={verifiedGstinData}
                  disabled={isView}
                  isEditMode={isEditMode}
                  isVerifying={Boolean(gstVerify.loading)}
                  onApply={handleApplyFetchedDetails}
                  onReverify={() => handleVerifyGstin({ forceRefresh: true })}
                />
              )}
            </>
          )}

          <div className="grid gap-5 xl:grid-cols-12">
            {standardSections.map((section) => {
              const meta = SECTION_META[section.id] ?? {
                description: "Configure this section",
                icon: Settings,
              };
              const visibleFields = section.fields.filter(
                (field) => !(hasGstinField && field.name === "gstin"),
              );
              const sectionClassName = hasGstinField
                ? section.id === "basic"
                  ? "order-1 xl:col-span-8"
                  : section.id === "gst"
                    ? "order-1 xl:col-span-4"
                    : section.id === "credit"
                      ? "order-3 xl:col-span-8"
                      : section.id === "additional"
                        ? "order-3 xl:col-span-4"
                        : "order-3 xl:col-span-12"
                : "xl:col-span-6";

              return (
                <SectionCard
                  key={section.id}
                  className={sectionClassName}
                  description={meta.description}
                  icon={meta.icon}
                  id={section.id}
                  title={getSectionTitle(section, hasGstinField)}
                >
                  <div
                    className={[
                      "grid gap-4",
                      section.id === "basic"
                        ? "sm:grid-cols-2 2xl:grid-cols-3"
                        : "sm:grid-cols-2",
                    ].join(" ")}
                  >
                    {section.id === "gst" && hasGstinField && (
                      <GstTaxSummary
                        gstin={normalizedGstin}
                        verifiedData={verifiedGstinData}
                      />
                    )}
                    {visibleFields.map((field) => (
                      <div
                        key={field.name}
                        className={
                          field.type === "boolean" || isTextareaField(field.name)
                            ? "sm:col-span-2"
                            : ""
                        }
                      >
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                </SectionCard>
              );
            })}

            {hasAddressFields && addressSection && (
              <SectionCard
                className="order-2 xl:col-span-12"
                description={SECTION_META.address.description}
                icon={SECTION_META.address.icon}
                id="address"
                title={addressSection.title}
              >
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-slate-900">Billing address</h4>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Used on invoices, tax documents and account statements.
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {billingFields.map((field) => (
                        <div
                          key={field.name}
                          className={
                            /AddressLine/i.test(field.name) ? "sm:col-span-2" : ""
                          }
                        >
                          {renderField(field)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Shipping address</h4>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Used for dispatch and delivery documents.
                        </p>
                      </div>
                      {!isView && (
                        <button
                          type="button"
                          aria-pressed={shippingSameAsBilling}
                          onClick={handleShippingAddressToggle}
                          className={[
                            "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold transition-colors",
                            shippingSameAsBilling
                              ? "border-brand/30 bg-brand-light text-brand-dark"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100",
                          ].join(" ")}
                        >
                          {shippingSameAsBilling ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          Same as billing
                        </button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {shippingFields.map((field) => (
                        <div
                          key={field.name}
                          className={
                            /AddressLine/i.test(field.name) ? "sm:col-span-2" : ""
                          }
                        >
                          {renderField(field, {
                            disabled: shippingSameAsBilling,
                            helperText: shippingSameAsBilling
                              ? "Copied from billing address"
                              : undefined,
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-xs font-medium text-slate-500">
          {hasGstinField
            ? "Party Code and Party Name are required. All details are saved together."
            : "Review the settings before saving."}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
          >
            {isView ? "Close" : "Cancel"}
          </button>
          {!isView && (
            <>
              {isNewParty && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    saveFormDraft("party-create", values);
                    toast.success("Party draft saved on this device");
                    onClose();
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
                >
                  Save as Draft
                </button>
              )}
              <button
                type="submit"
                disabled={
                  isSubmitting || (hasGstinField && Boolean(gstVerify.loading))
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Saving..." : submitLabel ?? "Save"}
                {isSubmitting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
            </>
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
  const isPartyForm = fields.some((field) => field.name === "gstin");
  const [isFormBusy, setIsFormBusy] = useState(false);
  const groupedFields = useMemo(() => {
    return sections
      .map((section) => ({
        ...section,
        fields: fields.filter((field) => field.section === section.id),
      }))
      .filter((section) => section.fields.length > 0);
  }, [fields, sections]);

  const requestClose = useCallback(() => {
    if (!isFormBusy) {
      onClose();
    }
  }, [isFormBusy, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        requestClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, requestClose]);

  const Icon = icon === "settings" ? Settings : Contact;
  const formKey = `${mode}:${source?.id ?? "new"}:${fields
    .map((field) => field.name)
    .join("|")}`;

  const modalTitle =
    title ?? (mode === "edit" ? "Edit Party" : mode === "view" ? "View Party" : "Add Party");
  const modalDescription =
    description ??
    (mode === "edit"
      ? "Update every Party detail in one place."
      : mode === "view"
        ? "Review Party details."
        : "Verify GSTIN to auto-fill details, then review and create the Party.");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={requestClose}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="party-modal-title"
            aria-busy={isFormBusy || undefined}
            className={[
              "flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]",
              isPartyForm ? "max-w-[1480px]" : "max-w-6xl",
            ].join(" ")}
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
                onClick={requestClose}
                disabled={isFormBusy}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
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
                onBusyChange={setIsFormBusy}
                onClose={requestClose}
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
