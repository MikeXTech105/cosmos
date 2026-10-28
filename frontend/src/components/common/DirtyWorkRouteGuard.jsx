import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { dirtyWorkMessage, hasDirtyWork } from "../../utils/dirtyWork";

export default function DirtyWorkRouteGuard() {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => hasDirtyWork() && (
    currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search
  ));
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm(dirtyWorkMessage())) blocker.proceed();
    else blocker.reset();
  }, [blocker]);
  return null;
}
