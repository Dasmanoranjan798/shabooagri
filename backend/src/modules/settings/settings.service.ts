import { AppError } from "../../shared/errors/AppError";
import * as rbacService from "../rbac/rbac.service";
import * as settingsRepo from "./settings.repository";
import type { AuthenticatedUser } from "../auth/auth.types";
import type { UpdateCompanyProfileInput, UpdateTerminologyInput } from "./settings.validators";

async function assertCompanyExists(companyId: string) {
  const company = await settingsRepo.findCompanyById(companyId);
  if (!company) throw new AppError(404, "Company not found");
  return company;
}

// Bank account number, IFSC, and UPI ID are payment-collection details, not
// general company branding — the route intentionally lets any authenticated
// user read the rest of the profile (name, logo, currency, job-completion
// rules, etc.), so the redaction happens here rather than by gating the
// whole route behind settings.manage, which would also block Drivers from
// reading the job-completion flags this same endpoint carries.
const FINANCIAL_FIELDS = ["bankName", "accountNumber", "ifscCode", "upiId"] as const;

export async function getCompanyProfile(companyId: string, user: AuthenticatedUser) {
  const company = await assertCompanyExists(companyId);

  const canViewFinancials = await rbacService.userHasPermission(user.roleId, "settings.manage");
  if (canViewFinancials) {
    return company;
  }

  const redacted = { ...company };
  for (const field of FINANCIAL_FIELDS) {
    redacted[field] = null;
  }
  return redacted;
}

export async function updateCompanyProfile(companyId: string, input: UpdateCompanyProfileInput) {
  await assertCompanyExists(companyId);
  return settingsRepo.updateCompanyProfile(companyId, input);
}

// Updates multiple terminology labels in one call. Each term key is upserted
// independently — partial updates are fine (only pass the keys you want to change).
export async function updateTerminology(companyId: string, input: UpdateTerminologyInput) {
  const results = await Promise.all(
    input.terms.map((t) =>
      settingsRepo.upsertTerminologySetting(
        companyId,
        t.termKey,
        t.displayLabelSingular,
        t.displayLabelPlural,
      ),
    ),
  );
  return results;
}
