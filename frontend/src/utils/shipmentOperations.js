const toQuantity = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const QUANTITY_EPSILON = 1e-9;

export const getPackageAllocationTotals = (packages = []) =>
  packages.reduce((totals, shipmentPackage) => {
    (shipmentPackage?.items ?? []).forEach((item) => {
      const key = String(item.shipmentItemId ?? "");
      totals[key] = (totals[key] ?? 0) + toQuantity(item.quantity);
    });

    return totals;
  }, {});

export const getPackingReconciliation = (
  shipmentItems = [],
  packages = [],
  draftItems = [],
) => {
  const committed = getPackageAllocationTotals(packages);
  const draft = draftItems.reduce((totals, item) => {
    const key = String(item.shipmentItemId ?? "");
    totals[key] = (totals[key] ?? 0) + toQuantity(item.quantity);
    return totals;
  }, {});

  return shipmentItems.map((item) => {
    const key = String(item.id);
    const planned = toQuantity(item.plannedQuantity);
    const allocated = (committed[key] ?? 0) + (draft[key] ?? 0);
    const rawRemaining = planned - allocated;
    const remaining =
      Math.abs(rawRemaining) <= QUANTITY_EPSILON ? 0 : rawRemaining;

    return {
      allocated,
      isOverAllocated: remaining < -QUANTITY_EPSILON,
      isUnderAllocated: remaining > QUANTITY_EPSILON,
      planned,
      remaining,
      shipmentItemId: item.id,
    };
  });
};

export const isMixedPackageAllocation = (items = []) =>
  new Set(
    items
      .filter((item) => toQuantity(item.quantity) > 0)
      .map((item) => String(item.shipmentItemId)),
  ).size > 1;

export const validateReturnReceiveLine = (line = {}) => {
  const receivedBackQuantity = toQuantity(line.receivedBackQuantity);
  const restockableQuantity = toQuantity(line.restockableQuantity);
  const damagedQuantity = toQuantity(line.damagedQuantity);
  const nonRestockableQuantity = toQuantity(line.nonRestockableQuantity);
  const returnQuantity = toQuantity(line.returnQuantity);
  const splitTotal =
    restockableQuantity + damagedQuantity + nonRestockableQuantity;
  const errors = [];

  if (
    [
      receivedBackQuantity,
      restockableQuantity,
      damagedQuantity,
      nonRestockableQuantity,
    ].some((value) => value < 0)
  ) {
    errors.push("Return quantities cannot be negative.");
  }

  if (
    Math.abs(splitTotal - receivedBackQuantity) > QUANTITY_EPSILON
  ) {
    errors.push(
      "Restockable, damaged and non-restockable quantities must equal the received-back quantity.",
    );
  }

  if (receivedBackQuantity - returnQuantity > QUANTITY_EPSILON) {
    errors.push("Received-back quantity cannot exceed the return quantity.");
  }

  return {
    errors,
    isValid: errors.length === 0,
    receivedBackQuantity,
    restockableQuantity,
    splitTotal,
  };
};

export const validateReturnReceive = (lines = []) => {
  const results = lines.map(validateReturnReceiveLine);

  return {
    errors: results.flatMap((result, index) =>
      result.errors.map((message) => ({ index, message })),
    ),
    isValid: results.every((result) => result.isValid),
    totalRestockable: results.reduce(
      (total, result) => total + result.restockableQuantity,
      0,
    ),
  };
};
