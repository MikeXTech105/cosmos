import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { CompanyDraftScopeContext } from "../../hooks/companyDraftScopeContext";
import { getUserScope } from "../../utils/userScope";
import productionApi from "../../services/manufacturing/productionApi";
import { unwrapResponse } from "../../services/apiServiceUtils";

export default function CompanyDraftScopeProvider({ children }) {
  const auth = useSelector((state) => state.auth);
  const account = getUserScope(auth);
  const [verified, setVerified] = useState({ account: null, company: null });
  useEffect(() => {
    if (!account) return;
    const controller = new AbortController();
    // Existing authenticated runtime endpoint validates the actual catalog identity.
    productionApi.get("/api/v1/manufacturing/runtime", { signal: controller.signal }).then((response) => {
      if (!controller.signal.aborted) setVerified({ account, company: unwrapResponse(response).data?.companyKey ?? null });
    }).catch(() => { if (!controller.signal.aborted) setVerified({ account, company: null }); });
    return () => controller.abort();
  }, [account]);
  const scope = account && verified.account === account && verified.company ? `${account}:${encodeURIComponent(verified.company)}` : null;
  return <CompanyDraftScopeContext.Provider key={account ?? "signed-out"} value={scope}>{children}</CompanyDraftScopeContext.Provider>;
}
