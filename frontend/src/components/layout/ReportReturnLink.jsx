import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { workReturnPath } from "../../utils/workReturnPath";

export default function ReportReturnLink() {
  const { state, search, pathname } = useLocation();
  const auth = useSelector((snapshot) => snapshot.auth);
  const destination = workReturnPath(state?.fromReport ?? state?.returnTo ?? new URLSearchParams(search).get("returnTo"), auth);
  if (!destination || destination.split(/[?#]/)[0] === pathname) return null;
  return <Link to={destination} className="mb-4 inline-flex text-sm font-semibold text-brand hover:underline">{state?.fromReport ? "← Back to filtered report" : "← Return to original work"}</Link>;
}
