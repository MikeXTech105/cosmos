import axiosInstance from "../../api/axios";
import exactApi, { parseProductionJson } from "../manufacturing/productionApi";
import { decimalWire, idWire } from "../../utils/productionValues";
import { ENDPOINTS } from "../../api/endpoints";
import { normalizeItemClassification } from "../../utils/itemClassification";
import { sanitizeInventoryListParams } from "../../utils/inventoryQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const ITEM_SORT_FIELDS = ["name", "itemCode", "createdAt"];

const ITEM_LIST_PARAM_KEYS = [
  "Search",
  "Barcode",
  "ItemCode",
  "CategoryId",
  "ProcurementClassification",
  "IsActive",
  "PageNumber",
  "PageSize",
  "SortBy",
  "SortDirection",
];

const ITEM_CREATE_FORM_FIELDS = [
  ["Name", "name"],
  ["ItemCode", "itemCode"],
  ["Barcode", "barcode"],
  ["CategoryId", "categoryId"],
  ["UnitId", "unitId"],
  ["ItemType", "itemType"],
  ["ProcurementClassification", "procurementClassification"],
  ["PurchasePrice", "purchasePrice"],
  ["SalesPrice", "salesPrice"],
  ["HSNCode", "hsnCode"],
  ["GSTRate", "gstRate"],
  ["TrackInventory", "trackInventory"],
  ["IsManufactured", "isManufactured"],
  ["OpeningStock", "openingStock"],
  ["OpeningStockValue", "openingStockValue"],
  ["CurrentStock", "currentStock"],
  ["ReservedStock", "reservedStock"],
  ["MinimumStock", "minimumStock"],
  ["Description", "description"],
  ["IsActive", "isActive"],
];

const appendFormValue = (formData, key, value) => {
  if (value === null || value === undefined || value === "") {
    return;
  }

  formData.append(key, String(value));
};

const buildItemCreateFormData = (payload) => {
  const formData = new FormData();

  ITEM_CREATE_FORM_FIELDS.forEach(([formKey, payloadKey]) => {
    appendFormValue(formData, formKey, payload?.[payloadKey]);
  });

  if (payload?.imageFile) {
    formData.append("Image", payload.imageFile);
  }

  return formData;
};

const buildItemCommandBody = (payload) => {
  const commandBody = {
    ...payload,
    // Unlike create, update must send null so clearing does not preserve the old value.
    procurementClassification: normalizeItemClassification(
      payload?.procurementClassification,
    ),
  };

  delete commandBody.imageFile;
  for (const key of ["categoryId", "unitId"]) if (commandBody[key] != null && commandBody[key] !== "") commandBody[key] = idWire(commandBody[key]);
  for (const key of ["openingStock", "currentStock", "reservedStock", "minimumStock", "openingStockValue", "salesPrice", "purchasePrice"]) {
    if (commandBody[key] !== undefined) commandBody[key] = decimalWire(commandBody[key], { scale: ["openingStockValue", "salesPrice", "purchasePrice"].includes(key) ? 2 : 6, integerDigits: 16 });
  }

  return commandBody;
};

const getItemListParams = (params = {}) => {
  return Object.fromEntries(
    ITEM_LIST_PARAM_KEYS.map((key) => [
      key,
      key === "ProcurementClassification" &&
      params[key] === "all"
        ? undefined
        : params[key],
    ]),
  );
};

export const itemService = {
  getItems: async (params, { signal } = {}) => {
    const response = await exactApi.get(ENDPOINTS.ITEMS, {
      signal,
      params: normalizeParams(
        sanitizeInventoryListParams(
          getItemListParams(params),
          ITEM_SORT_FIELDS,
        ),
      ),
    });

    return unwrapResponse(response);
  },

  getItemById: async (id, { signal } = {}) => {
    const response = await exactApi.get(ENDPOINTS.ITEM_BY_ID(id), { signal });

    return unwrapResponse(response);
  },

  createItem: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.ITEMS,
      buildItemCreateFormData(payload),
      {
        // Preserve Axios' multipart request handling; only opt the create response into exact JSON.
        transformResponse: [value=>typeof value==="string"&&value.length?parseProductionJson(value):value],
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return unwrapResponse(response);
  },

  updateItem: async (id, payload) => {
    const response = await exactApi.put(
      ENDPOINTS.ITEM_BY_ID(id),
      buildItemCommandBody(payload),
    );

    return unwrapResponse(response);
  },

  deleteItem: async (id) => {
    const response = await axiosInstance.delete(ENDPOINTS.ITEM_BY_ID(id));

    return unwrapResponse(response);
  },
};
