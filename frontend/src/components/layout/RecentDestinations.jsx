import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSidebar } from "../../hooks/useSidebar";
import useUserPreferences from "../../hooks/useUserPreferences";

const empty = { pinned: [], recent: [], workspace: "" };
export default function RecentDestinations() {
  const { pathname } = useLocation();
  const { flatMenuItems } = useSidebar();
  const [, setPreferences] = useUserPreferences("navigation", empty);
  const route = flatMenuItems.find((item) => item.route === pathname)?.route;
  useEffect(() => {
    if (route) setPreferences((current) => ({ ...current, recent: [route, ...(current.recent ?? []).filter((entry) => entry !== route)].slice(0, 8) }));
  }, [route, setPreferences]);
  return null;
}
