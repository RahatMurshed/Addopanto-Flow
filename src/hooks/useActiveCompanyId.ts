import { useCompany } from "@/contexts/CompanyContext";

/**
 * Returns the active company ID. Throws if called outside CompanyProvider.
 * Use in mutation hooks to automatically inject company_id into inserts.
 */
export function useActiveCompanyId(): string | null {
  const { activeCompanyId } = useCompany();
  return activeCompanyId;
}
