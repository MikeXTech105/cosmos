import AppLookup from "../../components/common/AppLookup";
import { documentLookupService } from "../../services/documentLookupService";
import exactApi from "../../services/manufacturing/productionApi";
import { unwrapResponse } from "../../services/apiServiceUtils";
import { ENDPOINTS } from "../../api/endpoints";
import { lookupPage } from "../../utils/lookupPage";

export default function GstRegistrationLookup({activeOnly=false,...props}) {
  return <AppLookup {...props} placeholder="Search GSTIN, legal name or branch"
    loadPage={async ({ search, page, pageSize, signal }) => lookupPage(await documentLookupService.registrations({ Search: search, PageNumber: page, PageSize: pageSize,...(activeOnly?{Status:"Active"}:{}) }, { signal }), page, pageSize)}
    loadById={async (id, { signal } = {}) => unwrapResponse(await exactApi.get(ENDPOINTS.GST_REGISTRATION(id), { signal })).data}
    getOptionLabel={row => [row.gstin, row.legalName, row.branchName || row.city].filter(Boolean).join(" · ")} />;
}
