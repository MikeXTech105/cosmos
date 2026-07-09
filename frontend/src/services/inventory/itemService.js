import axiosInstance from "../../api/axios";
import { ENDPOINTS } from "../../api/endpoints";
import { sanitizeInventoryListParams } from "../../utils/inventoryQuery";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const ITEM_SORT_FIELDS = ["name", "itemCode", "createdAt"];

const ITEM_CREATE_FORM_FIELDS = [
  ["Name", "name"],
  ["ItemCode", "itemCode"],
  ["Barcode", "barcode"],
  ["CategoryId", "categoryId"],
  ["UnitId", "unitId"],
  ["ItemType", "itemType"],
  ["PurchasePrice", "purchasePrice"],
  ["SalesPrice", "salesPrice"],
  ["HSNCode", "hsnCode"],
  ["GSTRate", "gstRate"],
  ["TrackInventory", "trackInventory"],
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
  const commandBody = { ...payload };

  delete commandBody.imageFile;

  return commandBody;
};

export const itemService = {
  getItems: async (params) => {
    const response = await axiosInstance.get(ENDPOINTS.ITEMS, {
      params: normalizeParams(
        sanitizeInventoryListParams(params, ITEM_SORT_FIELDS),
      ),
    });

    return unwrapResponse(response);
  },

  getItemById: async (id) => {
    const response = await axiosInstance.get(ENDPOINTS.ITEM_BY_ID(id));

    return unwrapResponse(response);
  },

  createItem: async (payload) => {
    const response = await axiosInstance.post(
      ENDPOINTS.ITEMS,
      buildItemCreateFormData(payload),
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return unwrapResponse(response);
  },

  updateItem: async (id, payload) => {
    const response = await axiosInstance.put(
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
