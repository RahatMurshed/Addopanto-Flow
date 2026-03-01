/**
 * Format a raw digit string as a BD phone number: 01XXX-XXXXXX
 * International numbers (starting with +) are returned untouched.
 */
export function formatBDPhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) return trimmed;

  const digits = trimmed.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Strip formatting (dashes) to get raw digits for storage.
 */
export function stripPhoneFormat(formatted: string): string {
  return formatted.replace(/-/g, "");
}

/**
 * Clean a phone number to international format (+880...).
 * Previously defined in ProfileHeader — moved here for reuse.
 */
export function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return `+${digits}`;
  if (digits.startsWith("0")) return `+880${digits.slice(1)}`;
  return `+880${digits}`;
}
