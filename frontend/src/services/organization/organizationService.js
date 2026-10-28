import api from "../../api/axios";
import { ENDPOINTS as E } from "../../api/endpoints";
import { normalizeParams, unwrapResponse } from "../apiServiceUtils";

const get = async (url, params) => unwrapResponse(await api.get(url, { params: normalizeParams(params) }));
const post = async (url, body) => unwrapResponse(await api.post(url, body));
const put = async (url, body) => unwrapResponse(await api.put(url, body));

export const organizationService = {
  companies: (params) => get(E.ORGANIZATION_COMPANIES, params),
  company: (id) => get(E.ORGANIZATION_COMPANY_BY_ID(id)),
  saveCompany: (id, values) => id ? put(E.ORGANIZATION_COMPANY_BY_ID(id), values) : post(E.ORGANIZATION_COMPANIES, values),
  branches: (params) => get(E.ORGANIZATION_BRANCHES, params),
  branch: (id) => get(E.ORGANIZATION_BRANCH_BY_ID(id)),
  saveBranch: (id, values) => id ? put(E.ORGANIZATION_BRANCH_BY_ID(id), values) : post(E.ORGANIZATION_BRANCHES, values),
  myScope: () => get(E.ORGANIZATION_SCOPE_ASSIGNMENTS_ME),
  assignments: (userId) => get(E.ORGANIZATION_SCOPE_ASSIGNMENTS_USER(userId)),
  grant: (values) => post(E.ORGANIZATION_SCOPE_ASSIGNMENTS, values),
  revoke: async (id) => unwrapResponse(await api.delete(E.ORGANIZATION_SCOPE_ASSIGNMENT_BY_ID(id))),
};
