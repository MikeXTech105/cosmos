import api from "../manufacturing/productionApi";
import { unwrapResponse } from "../apiServiceUtils";
import { idWire } from "../../utils/productionValues";
const root = "/api/v1/oee/production-entries/day-acknowledgements";
export const oeeDayAcknowledgementService = {
  list: async (query, { signal } = {}) => unwrapResponse(await api.get(root, { params: query, signal })),
  save: async request => unwrapResponse(await api.post(request.previousId ? `${root}/${encodeURIComponent(request.previousId)}/revision` : root, { ...request, machineId: idWire(request.machineId), previousId: request.previousId ? idWire(request.previousId) : null })),
  // A report/event history, intentionally read through all pages of the explicit
  // bounded period. Master catalogs are queried separately on demand.
  all: async ({ fromDate, toDate }, { signal } = {}) => {
    const result = [];
    for (let page = 1; page <= 1000; page += 1) {
      const response = await oeeDayAcknowledgementService.list({ FromDate: fromDate, ToDate: toDate, PageNumber: page, PageSize: 200 }, { signal });
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const data = response.data;
      if (!Array.isArray(data?.items)) throw new Error("Acknowledgement history could not be verified.");
      result.push(...data.items);
      if (page >= Number(data.totalPages) || data.items.length === 0 || data.items.length < 200) return result;
    }
    throw new Error("Narrow the acknowledgement period to review the complete history.");
  },
};
