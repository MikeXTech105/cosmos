import { useContext } from "react";
import { useSelector } from "react-redux";
import { CompanyDraftScopeContext } from "./companyDraftScopeContext";
import { getTrustedDraftScope } from "../utils/userScope";

export default function useListReturnScope() {
  const auth = useSelector(state => state.auth ?? {});
  const verified = useContext(CompanyDraftScopeContext);
  return { auth, scope: verified ?? getTrustedDraftScope(auth) };
}
