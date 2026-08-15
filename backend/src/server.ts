import { app } from "./app";
import { env } from "./config/env";
import { SaasLicenseService } from "./modules/saas/licenses/saasLicense.service";

app.listen(env.PORT, () => {
  console.log(`ShabooAgri API listening on port ${env.PORT} (${env.NODE_ENV})`);
});

// Nothing else ever flips a lapsed license out of LICENSE_ACTIVE — run the
// sweep once at boot, then hourly, so tenant access actually gets cut off
// when a subscription expires instead of running forever.
const licenseService = new SaasLicenseService();
const LICENSE_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

function runLicenseSweep() {
  licenseService
    .sweepExpiredLicenses()
    .then(({ expiredCount, expiringSoonCount }) => {
      if (expiredCount > 0 || expiringSoonCount > 0) {
        console.log(`[LicenseSweep] expired=${expiredCount} expiringSoon=${expiringSoonCount}`);
      }
    })
    .catch((err) => console.error("[LicenseSweep] failed:", err));
}

runLicenseSweep();
setInterval(runLicenseSweep, LICENSE_SWEEP_INTERVAL_MS);
