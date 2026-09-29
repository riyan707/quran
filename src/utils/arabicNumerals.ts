const EASTERN_ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Converts a non-negative integer to Eastern Arabic-Indic numerals (used for ayah-end medallions). */
export function toEasternArabicNumeral(n: number): string {
  return String(n)
    .split('')
    .map((digit) => EASTERN_ARABIC_DIGITS[Number(digit)] ?? digit)
    .join('');
}
