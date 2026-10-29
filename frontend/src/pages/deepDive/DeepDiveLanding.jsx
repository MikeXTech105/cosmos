import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { getAvailableDeepDivePages } from "./deepDiveConfig";
import { sourcePermissions } from "./deepDiveData";

export default function DeepDiveLanding() {
  const auth = useSelector((state) => state.auth);
  const location = useLocation();
  const destination = getAvailableDeepDivePages(sourcePermissions(auth))[0];

  return <Navigate replace to={{
    pathname: destination?.route || "/403",
    search: destination ? location.search : "",
  }} />;
}
