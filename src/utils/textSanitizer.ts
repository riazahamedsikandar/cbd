/**
 * Sanitizes mangled UTF-8 / ANSI characters (e.g. â€“ -> -, â€™ -> ', â€” -> -)
 * caused by Excel legacy ANSI imports/exports.
 */
export const cleanUnicodeString = (str: string = ""): string => {
  if (!str) return "";
  return str
    .replace(/â€“/g, "-")
    .replace(/â€”/g, "-")
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â/g, "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .trim();
};

/**
 * Normalizes product titles for 100% resilient matching regardless of dashes, spaces, or mangled characters.
 */
export const normalizeTitleForMatching = (title: string = ""): string => {
  if (!title) return "";
  return cleanUnicodeString(title)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // Remove all non-alphanumeric characters
    .trim();
};

/**
 * Replaces any obsolete brand names like "TwoBudz" or old locations with current store branding:
 * "CBD American Shaman of Hurst" / "cbdhurst.com" / "Hurst"
 */
export const sanitizeBrandText = (text: string = ""): string => {
  if (!text) return "";
  return text
    .replace(/twobudz\.com/gi, "cbdhurst.com")
    .replace(/shophurstcbd\.com/gi, "cbdhurst.com")
    .replace(/info@twobudz\.com/gi, "info@cbdhurst.com")
    .replace(/info@shophurstcbd\.com/gi, "info@cbdhurst.com")
    .replace(/twobudzcbd@gmail\.com/gi, "info@cbdhurst.com")
    .replace(/client@twobudz\.com/gi, "client@cbdhurst.com")
    .replace(/inquiry@twobudz\.com/gi, "inquiry@cbdhurst.com")
    .replace(/user@twobudz\.com/gi, "user@cbdhurst.com")
    .replace(/twobudz/gi, "CBD American Shaman of Hurst")
    .replace(/flower mound/gi, "Hurst");
};

