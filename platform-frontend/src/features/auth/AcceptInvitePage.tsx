import React from "react";
import { useSearchParams } from "react-router-dom";
import { AppHandoff } from "./AppHandoff";

// Staff-invite links (/accept-invite?token=..) are Android App Links that open
// the Flutter app directly when installed. Otherwise they land here — a minimal
// handoff to the app + a paste-the-token fallback. No operational logic runs on
// the web; accepting the invite happens entirely in the Flutter app.
export const AcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  return <AppHandoff kind="invite" token={token} />;
};
