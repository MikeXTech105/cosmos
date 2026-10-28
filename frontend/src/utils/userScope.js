import { getAuthData } from "./authStorage";
import { runtimeConfig } from "../config/runtimeConfig";

export function getUserScope(auth = getAuthData()) {
  const user = auth?.user;
  const userId = user?.id ?? user?.userId ?? user?.sub;
  // A single-company installation may expose no company claim. Scope by the
  // configured API origin as well, so browser preferences never cross catalogs.
  const company = user?.companyId ?? user?.companyKey ?? user?.tenantId;
  if (!userId) return null;
  return [window.location.origin, runtimeConfig.API_BASE_URL || window.location.origin, company ?? "installation", String(userId)].map(encodeURIComponent).join(":");
}

export function getTrustedDraftScope(auth = getAuthData()) {
  const user = auth?.user;
  const company = user?.companyId ?? user?.companyKey ?? user?.tenantId;
  return company ? getUserScope(auth) : null;
}
