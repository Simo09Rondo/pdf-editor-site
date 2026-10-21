/**
 * Open-source TrueType font replacements for standard PDF and Microsoft core fonts.
 * Each family has metrics matching the target proprietary font family.
 */

export type FontStyle = "regular" | "bold" | "italic" | "boldItalic";

export interface FontEntry {
  id: string;
  displayName: string;
  category: "sans-serif" | "serif" | "monospace";
  license: "Apache-2.0" | "OFL-1.1";
  designer: string;
  replaces: string[];
  styles: Record<FontStyle, string>;
}

export const FONT_REGISTRY: Record<string, FontEntry> = {
  arimo: {
    id: "arimo",
    displayName: "Arimo",
    category: "sans-serif",
    license: "Apache-2.0",
    designer: "Steve Matteson (Ascender Corp)",
    replaces: [
      "Arial",
      "ArialMT",
      "Arial-Bold",
      "Arial-BoldMT",
      "Arial-Italic",
      "Arial-ItalicMT",
      "Arial-BoldItalic",
      "Arial-BoldItalicMT",
      "Helvetica",
      "Helvetica-Bold",
      "Helvetica-Oblique",
      "Helvetica-BoldOblique",
    ],
    styles: {
      regular: "/fonts/Arimo-Regular.ttf",
      bold: "/fonts/Arimo-Bold.ttf",
      italic: "/fonts/Arimo-Italic.ttf",
      boldItalic: "/fonts/Arimo-BoldItalic.ttf",
    },
  },
  tinos: {
    id: "tinos",
    displayName: "Tinos",
    category: "serif",
    license: "Apache-2.0",
    designer: "Steve Matteson (Ascender Corp)",
    replaces: [
      "Times New Roman",
      "TimesNewRoman",
      "TimesNewRomanPSMT",
      "TimesNewRomanPS-BoldMT",
      "TimesNewRomanPS-ItalicMT",
      "TimesNewRomanPS-BoldItalicMT",
      "Times",
      "Times-Roman",
      "Times-Bold",
      "Times-Italic",
      "Times-BoldItalic",
    ],
    styles: {
      regular: "/fonts/Tinos-Regular.ttf",
      bold: "/fonts/Tinos-Bold.ttf",
      italic: "/fonts/Tinos-Italic.ttf",
      boldItalic: "/fonts/Tinos-BoldItalic.ttf",
    },
  },
  cousine: {
    id: "cousine",
    displayName: "Cousine",
    category: "monospace",
    license: "Apache-2.0",
    designer: "Steve Matteson (Ascender Corp)",
    replaces: [
      "Courier New",
      "CourierNew",
      "CourierNewPSMT",
      "CourierNewPS-BoldMT",
      "CourierNewPS-ItalicMT",
      "CourierNewPS-BoldItalicMT",
      "Courier",
      "Courier-Bold",
      "Courier-Oblique",
      "Courier-BoldOblique",
    ],
    styles: {
      regular: "/fonts/Cousine-Regular.ttf",
      bold: "/fonts/Cousine-Bold.ttf",
      italic: "/fonts/Cousine-Italic.ttf",
      boldItalic: "/fonts/Cousine-BoldItalic.ttf",
    },
  },
  carlito: {
    id: "carlito",
    displayName: "Carlito",
    category: "sans-serif",
    license: "OFL-1.1",
    designer: "Łukasz Dziedzic (Google)",
    replaces: [
      "Calibri",
      "Calibri-Bold",
      "Calibri-Italic",
      "Calibri-BoldItalic",
    ],
    styles: {
      regular: "/fonts/Carlito-Regular.ttf",
      bold: "/fonts/Carlito-Bold.ttf",
      italic: "/fonts/Carlito-Italic.ttf",
      boldItalic: "/fonts/Carlito-BoldItalic.ttf",
    },
  },
  caladea: {
    id: "caladea",
    displayName: "Caladea",
    category: "serif",
    license: "OFL-1.1",
    designer: "Carolina Giovagnoli & Andrés Torresi (Huerta Tipográfica)",
    replaces: [
      "Cambria",
      "Cambria-Bold",
      "Cambria-Italic",
      "Cambria-BoldItalic",
      "CambriaMath",
    ],
    styles: {
      regular: "/fonts/Caladea-Regular.ttf",
      bold: "/fonts/Caladea-Bold.ttf",
      italic: "/fonts/Caladea-Italic.ttf",
      boldItalic: "/fonts/Caladea-BoldItalic.ttf",
    },
  },
};

/**
 * Find the matching open-source replacement font family for a given PDF font name.
 */
export function findFontFamilyForPdfFont(pdfFontName: string): FontEntry | null {
  if (!pdfFontName) return null;
  const normalized = pdfFontName.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const entry of Object.values(FONT_REGISTRY)) {
    // Check direct replaces list
    for (const rep of entry.replaces) {
      const repNorm = rep.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normalized === repNorm || normalized.startsWith(repNorm)) {
        return entry;
      }
    }
    // Also check displayName itself
    if (normalized.startsWith(entry.displayName.toLowerCase())) {
      return entry;
    }
  }

  return null;
}

/**
 * Return the file path for a given font family and style.
 */
export function getFontFilePath(familyKey: string, style: FontStyle = "regular"): string | null {
  const entry = FONT_REGISTRY[familyKey.toLowerCase()];
  if (!entry) return null;
  return entry.styles[style] ?? entry.styles.regular;
}

/**
 * Return all 20 font file paths in the registry.
 */
export function getAllFontFilePaths(): string[] {
  const paths: string[] = [];
  for (const entry of Object.values(FONT_REGISTRY)) {
    for (const p of Object.values(entry.styles)) {
      paths.push(p);
    }
  }
  return paths;
}
