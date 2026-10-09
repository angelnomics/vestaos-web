// Turns 0712345678, +254712345678, 254 712 345 678 or 712345678 into 254712345678.
// Returns null when the number does not look like a Kenyan mobile number.
export function normalizePhone(input) {
  let s = String(input ?? "").replace(/[\s\-().]/g, "");
  if (s.startsWith("+")) s = s.slice(1);
  if (/^0[17]\d{8}$/.test(s)) s = "254" + s.slice(1);
  else if (/^[17]\d{8}$/.test(s)) s = "254" + s;
  return /^254[17]\d{8}$/.test(s) ? s : null;
}
export const PHONE_HINT = "Enter a valid Kenyan phone number, for example 0712345678.";
