import { useEffect, useState } from "react";

// Same 768px cutoff already used by the .sa-desktop-only/.sa-mobile-only
// CSS classes (src/styles/base.css) and DashboardPage's inline chart-size
// check — pulled out here because TaskTrayContext needs to branch actual
// render/behavior logic in JS, not just hide/show via CSS.
const MOBILE_BREAKPOINT_PX = 768;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT_PX : false,
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}
