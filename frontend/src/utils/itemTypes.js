export const ITEM_TYPE = {
  PRODUCT: 1,
  SERVICE: 2,
};

export const ITEM_TYPE_VALUES = [
  ITEM_TYPE.PRODUCT,
  ITEM_TYPE.SERVICE,
];

export const ITEM_TYPE_LABELS = {
  [ITEM_TYPE.PRODUCT]: "Product",
  [ITEM_TYPE.SERVICE]: "Service",
};

export const normalizeItemType = (value) => {
  if (
    value === ITEM_TYPE.SERVICE ||
    String(value).toLowerCase() === "service" ||
    Number(value) === ITEM_TYPE.SERVICE
  ) {
    return ITEM_TYPE.SERVICE;
  }

  return ITEM_TYPE.PRODUCT;
};

export const getItemTypeName = (value) => {
  return ITEM_TYPE_LABELS[normalizeItemType(value)];
};
