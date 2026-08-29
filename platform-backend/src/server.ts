import { app } from "./app";
import { env } from "./config/env";
import { startLicenseExpiryScheduler } from "./scheduler/licenseExpiryScheduler";

app.listen(env.PORT, () => {
  console.log(`ShabooAgri Platform API listening on port ${env.PORT} (${env.NODE_ENV})`);
  // §P2-7 — enforce license expiry on the app lifecycle.
  startLicenseExpiryScheduler();
});
