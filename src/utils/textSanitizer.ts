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
