import { AppError } from "../../shared/errors/AppError";
import * as settingsRepo from "./settings.repository";
import type { UpdateCompanyProfileInput, UpdateTerminologyInput } from "./settings.validators";

export async function getCompanyProfile(companyId: string) {
  const company = await settingsRepo.findCompanyById(companyId);
  if (!company) throw new AppError(404, "Company not found");
  return company;
}

export async function updateCompanyProfile(companyId: string, input: UpdateCompanyProfileInput) {
  await getCompanyProfile(companyId); // 404 guard
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
