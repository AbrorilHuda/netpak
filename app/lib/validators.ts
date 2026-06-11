/**
 * Validates an Indonesian phone number.
 * Accepts formats: 08xx, 628xx, +628xx (10-13 digits total).
 */
export function isValidIndonesianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[^\d+]/g, '');
  const phoneRegex = /^(?:\+62|62|0)8[1-9][0-9]{7,10}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Formats a phone number for WhatsApp (converts 0xxx to 62xxx).
 */
export function formatWhatsAppNumber(num: string): string {
  let cleaned = num.replace(/[^\d]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Normalize a Supabase join result: handles both array and object returns.
 * Supabase returns arrays for one-to-many and objects for many-to-one joins.
 */
export function normalizeJoin<T>(result: T | T[]): T {
  return Array.isArray(result) ? result[0] : result;
}
