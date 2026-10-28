import { addDecimal, compareDecimal, decimalText, subtractDecimal } from "./productionValues";
const toQuantity = value => { try { return decimalText(value == null || value === "" ? "0" : value); } catch { return "0"; } };
const present = (value, asText) => asText ? value : Number(value);

export const getPackageAllocationTotals = (packages = []) =>
  packages.reduce((totals, shipmentPackage) => {
    (shipmentPackage?.items ?? []).forEach((item) => {
      const key = String(item.shipmentItemId ?? "");
      totals[key] = addDecimal(totals[key] ?? "0", toQuantity(item.quantity));
    });

    return totals;
  }, {});

export const getPackingReconciliation = (
  shipmentItems = [],
  packages = [],
  draftItems = [],
) => {
  const asText = [...shipmentItems.map(item => item.plannedQuantity), ...packages.flatMap(pack => (pack.items ?? []).map(item => item.quantity)), ...draftItems.map(item => item.quantity)].some(value => typeof value === "string");
  const committed = getPackageAllocationTotals(packages);
  const draft = draftItems.reduce((totals, item) => {
    const key = String(item.shipmentItemId ?? "");
    totals[key] = addDecimal(totals[key] ?? "0", toQuantity(item.quantity));
    return totals;
  }, {});

  return shipmentItems.map((item) => {
    const key = String(item.id);
    const planned = toQuantity(item.plannedQuantity);
    const allocated = addDecimal(committed[key] ?? "0", draft[key] ?? "0");
    const remaining = subtractDecimal(planned, allocated);

    return {
      allocated: present(allocated, asText),
      isOverAllocated: compareDecimal(remaining, "0") < 0,
      isUnderAllocated: compareDecimal(remaining, "0") > 0,
      planned: present(planned, asText),
      remaining: present(remaining, asText),
      shipmentItemId: item.id,
    };
  });
};

export const isMixedPackageAllocation = (items = []) =>
  new Set(
    items
      .filter((item) => compareDecimal(toQuantity(item.quantity), "0") > 0)
      .map((item) => String(item.shipmentItemId)),
  ).size > 1;

export const validateReturnReceiveLine = (line = {}) => {
  const asText = Object.values(line).some(value => typeof value === "string");
  const receivedBackQuantity = toQuantity(line.receivedBackQuantity);
  const restockableQuantity = toQuantity(line.restockableQuantity);
  const damagedQuantity = toQuantity(line.damagedQuantity);
  const nonRestockableQuantity = toQuantity(line.nonRestockableQuantity);
  const returnQuantity = toQuantity(line.returnQuantity);
  const splitTotal =
    addDecimal(addDecimal(restockableQuantity, damagedQuantity), nonRestockableQuantity);
  const errors = [];
  if (["receivedBackQuantity", "restockableQuantity", "damagedQuantity", "nonRestockableQuantity", "returnQuantity"].some(key => {
    try { if (line[key] != null && line[key] !== "") decimalText(line[key]); return false; } catch { return true; }
  })) errors.push("Enter valid return quantities before review.");

  if (
    [
      receivedBackQuantity,
      restockableQuantity,
      damagedQuantity,
      nonRestockableQuantity,
    ].some((value) => compareDecimal(value, "0") < 0)
  ) {
    errors.push("Return quantities cannot be negative.");
  }

  if (
    compareDecimal(splitTotal, receivedBackQuantity) !== 0
  ) {
    errors.push(
      "Restockable, damaged and non-restockable quantities must equal the received-back quantity.",
    );
  }

  if (compareDecimal(receivedBackQuantity, returnQuantity) > 0) {
    errors.push("Received-back quantity cannot exceed the return quantity.");
  }

  return {
    errors,
    isValid: errors.length === 0,
    receivedBackQuantity: present(receivedBackQuantity, asText),
    restockableQuantity: present(restockableQuantity, asText),
    splitTotal: present(splitTotal, asText),
  };
};

export const validateReturnReceive = (lines = []) => {
  const results = lines.map(validateReturnReceiveLine);

  return {
    errors: results.flatMap((result, index) =>
      result.errors.map((message) => ({ index, message })),
    ),
    isValid: results.every((result) => result.isValid),
    totalRestockable: present(results.reduce((total, result) => addDecimal(total, result.restockableQuantity), "0"), lines.some(line => typeof line.restockableQuantity === "string")),
  };
};
