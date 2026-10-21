import type { FontStyle } from "./fontRegistry";

export interface DetectedFont {
  originalName: string;
  cleanName: string;
  isBold: boolean;
  isItalic: boolean;
  style: FontStyle;
  styleLabel: string;
  replacementFamily: string;
  matchedFamily: string;
  displayText: string;
}

/**
 * Remove a 6-letter subset prefix such as "ABCDEF+" from the font name.
 */
export function stripSubsetPrefix(fontName: string): string {
  if (!fontName) return "";
  return fontName.replace(/^[A-Z]{6}\+/, "");
}

/**
 * Read bold/italic from words in the name (Bold, Italic, Oblique, BoldMT, ItalicMT).
 */
export function detectFontStyle(fontName: string): {
  isBold: boolean;
  isItalic: boolean;
  style: FontStyle;
  styleLabel: string;
} {
  const clean = stripSubsetPrefix(fontName);

  // Check for Bold / BoldMT words in the font name
  const isBold =
    /(?:BoldMT|Bold)\b/i.test(clean) ||
    /[_-]Bold/i.test(clean) ||
    /Bold/i.test(clean);

  // Check for Italic / Oblique / ItalicMT words in the font name
  const isItalic =
    /(?:ItalicMT|Italic|Oblique)\b/i.test(clean) ||
    /[_-](?:Italic|Oblique)/i.test(clean) ||
    /(?:Italic|Oblique)/i.test(clean);

  const style: FontStyle =
    isBold && isItalic
      ? "boldItalic"
      : isBold
      ? "bold"
      : isItalic
      ? "italic"
      : "regular";

  const styleLabel =
    isBold && isItalic
      ? "Bold Italic"
      : isBold
      ? "Bold"
      : isItalic
      ? "Italic"
      : "Regular";

  return { isBold, isItalic, style, styleLabel };
}

/**
 * Detect font family replacement and matching rules:
 * 1. Remove 6-letter subset prefix, read bold/italic.
 * 2. Map:
 *    - Arial, ArialMT, Helvetica -> Arimo
 *    - Times, TimesNewRoman, TimesNewRomanPS, TimesNewRomanPSMT -> Tinos
 *    - Courier, CourierNew, CourierNewPSMT -> Cousine
 *    - Calibri -> Carlito
 *    - Cambria -> Caladea
 * 3. Fallback: guess via PDF serif / fixed-width flags, otherwise Arimo.
 *
 * Produces format:
 * "Original font: [name]. Replacement: [family] (matches [original family])."
 */
export function detectFont(originalFontName: string, flags = 0): DetectedFont {
  const originalName = originalFontName?.trim() || "Unknown";
  const cleanName = stripSubsetPrefix(originalName);
  const { isBold, isItalic, style, styleLabel } = detectFontStyle(cleanName);

  // Normalize by removing non-alphanumeric characters for robust prefix/word matching
  const norm = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "");

  let replacementFamily = "";
  let matchedFamily = "";

  // Rule 2 mappings
  if (
    norm.startsWith("timesnewroman") ||
    norm.startsWith("timesnewromanps") ||
    norm.startsWith("timesnewromanpsmt")
  ) {
    replacementFamily = "Tinos";
    matchedFamily = "Times New Roman";
  } else if (norm.startsWith("times")) {
    replacementFamily = "Tinos";
    matchedFamily = "Times";
  } else if (
    norm.startsWith("couriernew") ||
    norm.startsWith("couriernewpsmt")
  ) {
    replacementFamily = "Cousine";
    matchedFamily = "Courier New";
  } else if (norm.startsWith("courier")) {
    replacementFamily = "Cousine";
    matchedFamily = "Courier";
  } else if (norm.startsWith("calibri")) {
    replacementFamily = "Carlito";
    matchedFamily = "Calibri";
  } else if (norm.startsWith("cambria")) {
    replacementFamily = "Caladea";
    matchedFamily = "Cambria";
  } else if (norm.startsWith("helvetica")) {
    replacementFamily = "Arimo";
    matchedFamily = "Helvetica";
  } else if (norm.startsWith("arial") || norm.startsWith("arialmt")) {
    replacementFamily = "Arimo";
    matchedFamily = "Arial";
  } else {
    // Rule 3: If there is no exact match, guess using PDF's serif / fixed-width flags
    // PDF Spec (ISO 32000-1): Bit 1 = FixedPitch (1), Bit 2 = Serif (2)
    const isFixedPitch = Boolean(flags & 1);
    const isSerif = Boolean(flags & 2);

    if (isFixedPitch) {
      replacementFamily = "Cousine";
      matchedFamily = "Courier New";
    } else if (isSerif) {
      replacementFamily = "Tinos";
      matchedFamily = "Times New Roman";
    } else {
      replacementFamily = "Arimo";
      matchedFamily = "Arial";
    }
  }

  const displayText = `Original font: ${originalName}. Replacement: ${replacementFamily} (matches ${matchedFamily}).`;

  return {
    originalName,
    cleanName,
    isBold,
    isItalic,
    style,
    styleLabel,
    replacementFamily,
    matchedFamily,
    displayText,
  };
}
