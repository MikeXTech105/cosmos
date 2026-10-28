import { isRouteAuthorized } from "./authorizedRoute";

export function workReturnPath(candidate, auth) {
  if (typeof candidate !== "string" || !/^\/(?!\/)/.test(candidate) || /[\\\r\n]/.test(candidate)) return null;
  const path = candidate.split(/[?#]/)[0];
  return isRouteAuthorized({ ...auth, route: path }) ? candidate : null;
}
