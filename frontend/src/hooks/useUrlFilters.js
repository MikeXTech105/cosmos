import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

const DEFAULT_ACTIVE_COUNT_EXCLUSIONS = Object.freeze(["page", "size"]);
const DEFAULT_OPTIONS = Object.freeze({});
const VALID_HISTORY_MODES = new Set(["push", "replace"]);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const getUrlKey = (key, descriptor) => descriptor.url ?? key;

const valuesMatch = (left, right) => Object.is(left, right);

const searchParamsMatch = (left, right) => {
  const normalizeEntries = (searchParams) =>
    [...searchParams.entries()].sort(([leftKey, leftValue], [
      rightKey,
      rightValue,
    ]) => {
      const keyComparison = leftKey.localeCompare(rightKey);

      return keyComparison || leftValue.localeCompare(rightValue);
    });

  return JSON.stringify(normalizeEntries(left)) ===
    JSON.stringify(normalizeEntries(right));
};

const isIsoDate = (value) => {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const clampNumber = (value, clamp) => {
  if (!Array.isArray(clamp) || clamp.length !== 2) {
    return value;
  }

  const [minimum, maximum] = clamp.map(Number);
  let nextValue = value;

  if (Number.isFinite(minimum)) {
    nextValue = Math.max(minimum, nextValue);
  }
  if (Number.isFinite(maximum)) {
    nextValue = Math.min(maximum, nextValue);
  }

  return nextValue;
};

const parseEnumValue = (rawValue, descriptor) => {
  const options = Array.isArray(descriptor.options)
    ? descriptor.options
    : [];

  return (
    options.find((option) => String(option) === rawValue) ??
    descriptor.default
  );
};

const parseUrlValue = (rawValue, descriptor) => {
  if (rawValue === null) {
    return descriptor.default;
  }

  if (descriptor.type === "string") {
    return rawValue;
  }

  if (descriptor.type === "boolean") {
    if (rawValue === "true") {
      return true;
    }
    if (rawValue === "false") {
      return false;
    }

    return descriptor.default;
  }

  if (descriptor.type === "number") {
    if (!rawValue.trim()) {
      return descriptor.default;
    }

    const numericValue = Number(rawValue);

    if (!Number.isFinite(numericValue)) {
      return descriptor.default;
    }

    const normalizedValue =
      descriptor.integer === false ? numericValue : Math.trunc(numericValue);

    const clampedValue = clampNumber(
      normalizedValue,
      descriptor.clamp,
    );

    return typeof descriptor.validate === "function" &&
      !descriptor.validate(clampedValue)
      ? descriptor.default
      : clampedValue;
  }

  if (descriptor.type === "enum") {
    return parseEnumValue(rawValue, descriptor);
  }

  if (descriptor.type === "date") {
    return isIsoDate(rawValue) ? rawValue : descriptor.default;
  }

  return descriptor.default;
};

const normalizeWrittenValue = (value, descriptor) => {
  if (value === null || value === undefined) {
    return descriptor.default;
  }

  return parseUrlValue(String(value), descriptor);
};

const writeValuesToSearchParams = (schema, baseSearchParams, values) => {
  const nextSearchParams = new URLSearchParams(baseSearchParams);

  Object.entries(schema).forEach(([key, descriptor]) => {
    const urlKey = getUrlKey(key, descriptor);
    const value = values[key];

    nextSearchParams.delete(urlKey);

    if (!valuesMatch(value, descriptor.default)) {
      nextSearchParams.set(urlKey, String(value));
    }
  });

  return nextSearchParams;
};

export const readUrlFilters = (schema, inputSearchParams) => {
  const currentSearchParams = new URLSearchParams(inputSearchParams);
  const values = Object.fromEntries(
    Object.entries(schema).map(([key, descriptor]) => [
      key,
      parseUrlValue(
        currentSearchParams.get(getUrlKey(key, descriptor)),
        descriptor,
      ),
    ]),
  );
  const searchParams = writeValuesToSearchParams(
    schema,
    currentSearchParams,
    values,
  );

  return {
    needsReplace: !searchParamsMatch(searchParams, currentSearchParams),
    searchParams,
    values,
  };
};

const getKeysToClear = (clearOnChange, key, value, values) => {
  const rule = clearOnChange?.[key];

  if (typeof rule === "function") {
    const result = rule(value, values);

    return Array.isArray(result) ? result : [];
  }

  return Array.isArray(rule) ? rule : [];
};

export const buildUrlFilterUpdate = (
  schema,
  inputSearchParams,
  patch,
  options = {},
) => {
  const snapshot = readUrlFilters(schema, inputSearchParams);
  const values = { ...snapshot.values };
  const changedKeys = [];
  const clearedUrlKeys = new Set();

  Object.entries(patch).forEach(([key, value]) => {
    const descriptor = schema[key];

    if (!descriptor) {
      return;
    }

    const normalizedValue = normalizeWrittenValue(value, descriptor);

    if (!valuesMatch(values[key], normalizedValue)) {
      values[key] = normalizedValue;
      changedKeys.push(key);
    }
  });

  changedKeys.forEach((key) => {
    getKeysToClear(
      options.clearOnChange,
      key,
      values[key],
      snapshot.values,
    ).forEach((clearKey) => {
      const descriptor = schema[clearKey];

      if (descriptor && !valuesMatch(values[clearKey], descriptor.default)) {
        values[clearKey] = descriptor.default;
      } else if (!descriptor) {
        clearedUrlKeys.add(clearKey);
      }
    });
  });

  const pageKey = options.pageKey ?? "page";
  const pageDescriptor = schema[pageKey];
  const shouldResetPage = changedKeys.some((key) => key !== pageKey);

  if (
    shouldResetPage &&
    pageDescriptor &&
    !valuesMatch(values[pageKey], pageDescriptor.default)
  ) {
    values[pageKey] = pageDescriptor.default;
  }

  const searchParams = writeValuesToSearchParams(
    schema,
    snapshot.searchParams,
    values,
  );

  clearedUrlKeys.forEach((urlKey) => {
    searchParams.delete(urlKey);
  });
  const changed = !searchParamsMatch(
    searchParams,
    snapshot.searchParams,
  );
  const explicitHistory = options.history;
  const history = VALID_HISTORY_MODES.has(explicitHistory)
    ? explicitHistory
    : changedKeys.every((key) => schema[key]?.type === "string")
      ? "replace"
      : "push";

  return { changed, history, searchParams, values };
};

export const buildUrlFilterReset = (schema, inputSearchParams) => {
  const snapshot = readUrlFilters(schema, inputSearchParams);
  const values = Object.fromEntries(
    Object.entries(schema).map(([key, descriptor]) => [
      key,
      descriptor.default,
    ]),
  );
  const searchParams = writeValuesToSearchParams(
    schema,
    snapshot.searchParams,
    values,
  );

  return {
    changed: !searchParamsMatch(
      searchParams,
      snapshot.searchParams,
    ),
    history: "push",
    searchParams,
    values,
  };
};

const useUrlFilters = (schema, options = DEFAULT_OPTIONS) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const snapshot = useMemo(
    () => readUrlFilters(schema, searchParams),
    [schema, searchParams],
  );

  useEffect(() => {
    if (snapshot.needsReplace) {
      setSearchParams(snapshot.searchParams, { replace: true });
    }
  }, [
    setSearchParams,
    snapshot.needsReplace,
    snapshot.searchParams,
  ]);

  const commit = useCallback(
    (result) => {
      if (!result.changed) {
        return;
      }

      setSearchParams(result.searchParams, {
        replace: result.history === "replace",
      });
    },
    [setSearchParams],
  );

  const setValues = useCallback(
    (patch, updateOptions = {}) => {
      commit(
        buildUrlFilterUpdate(schema, searchParams, patch, {
          ...options,
          ...updateOptions,
        }),
      );
    },
    [commit, options, schema, searchParams],
  );

  const setValue = useCallback(
    (key, value, updateOptions) => {
      setValues({ [key]: value }, updateOptions);
    },
    [setValues],
  );

  const reset = useCallback(() => {
    commit(buildUrlFilterReset(schema, searchParams));
  }, [commit, schema, searchParams]);

  const activeCount = useMemo(() => {
    const exclusions = new Set(
      options.excludeFromActiveCount ??
        DEFAULT_ACTIVE_COUNT_EXCLUSIONS,
    );

    return Object.entries(schema).filter(
      ([key, descriptor]) =>
        !exclusions.has(key) &&
        !valuesMatch(snapshot.values[key], descriptor.default),
    ).length;
  }, [
    options.excludeFromActiveCount,
    schema,
    snapshot.values,
  ]);

  return {
    activeCount,
    reset,
    setValue,
    setValues,
    values: snapshot.values,
  };
};

export default useUrlFilters;
