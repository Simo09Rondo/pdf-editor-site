import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  readFontGlyphCoverage,
  checkCharacterCoverage,
  MalformedFontError,
} from "./fontCoverage";
import {
  getLanguageProfile,
  getAllLanguageCodes,
  type LanguageCode,
} from "./languageRegistry";

describe("Language Registry - Prompt 3L Profiles", () => {
  it("contains exactly the nine required language codes", () => {
    const codes = getAllLanguageCodes();
    expect(codes).toEqual(["pl", "cs", "tr", "ru", "uk", "bg", "sr", "el", "vi"]);
  });

  it("profiles have complete metadata and valid scripts", () => {
    for (const code of getAllLanguageCodes()) {
      const profile = getLanguageProfile(code);
      expect(profile).toBeDefined();
      expect(profile?.code).toBe(code);
      expect(profile?.nativeName.length).toBeGreaterThan(0);
      expect(["Latin", "Cyrillic", "Greek"]).toContain(profile?.script);
      expect(profile?.tesseractCode.length).toBe(3);
      expect(profile?.specialCharacters.length).toBeGreaterThan(0);
      expect(profile?.requiredCharacters.length).toBeGreaterThan(0);
      expect(profile?.allowedFontFamilies.length).toBeGreaterThan(0);
    }
  });

  it("accurately handles Turkish specific I, İ, ı, i", () => {
    const tr = getLanguageProfile("tr")!;
    expect(tr.requiredCharacters).toContain("ı"); // U+0131 Latin small dotless i
    expect(tr.requiredCharacters).toContain("i"); // U+0069 Latin small letter i
    expect(tr.requiredCharacters).toContain("I"); // U+0049 Latin capital letter I
    expect(tr.requiredCharacters).toContain("İ"); // U+0130 Latin capital letter I with dot above
    expect(tr.specialCharacters).toContain("ı");
    expect(tr.specialCharacters).toContain("İ");
  });

  it("accurately handles Ukrainian specific letters ґ, є, і, ї", () => {
    const uk = getLanguageProfile("uk")!;
    expect(uk.requiredCharacters).toContain("ґ");
    expect(uk.requiredCharacters).toContain("є");
    expect(uk.requiredCharacters).toContain("і");
    expect(uk.requiredCharacters).toContain("ї");
    expect(uk.requiredCharacters).toContain("Ґ");
    expect(uk.requiredCharacters).toContain("Є");
    expect(uk.requiredCharacters).toContain("І");
    expect(uk.requiredCharacters).toContain("Ї");
  });

  it("accurately handles Serbian Cyrillic special letters ђ, ј, љ, њ, ћ, џ", () => {
    const sr = getLanguageProfile("sr")!;
    expect(sr.requiredCharacters).toContain("ђ");
    expect(sr.requiredCharacters).toContain("ј");
    expect(sr.requiredCharacters).toContain("љ");
    expect(sr.requiredCharacters).toContain("њ");
    expect(sr.requiredCharacters).toContain("ћ");
    expect(sr.requiredCharacters).toContain("џ");
    expect(sr.requiredCharacters).toContain("Ђ");
    expect(sr.requiredCharacters).toContain("Ј");
    expect(sr.requiredCharacters).toContain("Љ");
    expect(sr.requiredCharacters).toContain("Њ");
    expect(sr.requiredCharacters).toContain("Ћ");
    expect(sr.requiredCharacters).toContain("Џ");
  });

  it("accurately handles Greek final sigma ς, accents, and diaereses", () => {
    const el = getLanguageProfile("el")!;
    expect(el.requiredCharacters).toContain("ς"); // Final sigma
    expect(el.requiredCharacters).toContain("σ"); // Medial sigma
    expect(el.requiredCharacters).toContain("ά");
    expect(el.requiredCharacters).toContain("ώ");
    expect(el.requiredCharacters).toContain("Ά");
    expect(el.requiredCharacters).toContain("Ώ");
    expect(el.requiredCharacters).toContain("ϊ");
    expect(el.requiredCharacters).toContain("ΐ");
    expect(el.requiredCharacters).toContain("Ϊ");
  });

  it("accurately includes comprehensive Vietnamese tone-marked vowels", () => {
    const vi = getLanguageProfile("vi")!;
    expect(vi.requiredCharacters).toContain("đ");
    expect(vi.requiredCharacters).toContain("Đ");
    // a tones
    expect(vi.requiredCharacters).toContain("à");
    expect(vi.requiredCharacters).toContain("ả");
    expect(vi.requiredCharacters).toContain("ã");
    expect(vi.requiredCharacters).toContain("ạ");
    // ă tones
    expect(vi.requiredCharacters).toContain("ằ");
    expect(vi.requiredCharacters).toContain("ẵ");
    expect(vi.requiredCharacters).toContain("ặ");
    // â tones
    expect(vi.requiredCharacters).toContain("ầ");
    expect(vi.requiredCharacters).toContain("ẩ");
    expect(vi.requiredCharacters).toContain("ậ");
    // ơ tones
    expect(vi.requiredCharacters).toContain("ớ");
    expect(vi.requiredCharacters).toContain("ợ");
    // ư tones
    expect(vi.requiredCharacters).toContain("ứ");
    expect(vi.requiredCharacters).toContain("ự");
    // Total count includes all vowels + consonants + tones
    expect(vi.requiredCharacters.length).toBeGreaterThan(130);
  });
});

describe("TrueType SFNT cmap parser (fontCoverage.ts)", () => {
  it("rejects truncated or invalid buffers with MalformedFontError", () => {
    expect(() => readFontGlyphCoverage(new Uint8Array(10))).toThrow(MalformedFontError);
    expect(() => readFontGlyphCoverage(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]))).toThrow(
      MalformedFontError,
    );
  });

  it("rejects font with no cmap table", () => {
    // 12-byte header with sfntVersion=0x00010000, numTables=1, table tag='head' (no cmap)
    const buf = new Uint8Array(28);
    const view = new DataView(buf.buffer);
    view.setUint32(0, 0x00010000);
    view.setUint16(4, 1);
    // Table tag 'head'
    buf[12] = 0x68; buf[13] = 0x65; buf[14] = 0x61; buf[15] = 0x64;
    view.setUint32(20, 28); // offset
    view.setUint32(24, 0); // length
    expect(() => readFontGlyphCoverage(buf)).toThrow("No 'cmap' table found");
  });

  it("accurately detects missing characters using checkCharacterCoverage", () => {
    const glyphs = new Set([65, 66, 67]); // 'A', 'B', 'C'
    const res = checkCharacterCoverage(glyphs, ["A", "B", "C", "D", "E"]);
    expect(res.ok).toBe(false);
    expect(res.totalRequired).toBe(5);
    expect(res.coveredCount).toBe(3);
    expect(res.missing).toEqual(["D", "E"]);
  });

  it("returns ok=true when all required characters are present", () => {
    const glyphs = new Set([65, 66, 67, 68]);
    const res = checkCharacterCoverage(glyphs, ["A", "B", "C", "D"]);
    expect(res.ok).toBe(true);
    expect(res.missing).toHaveLength(0);
  });
});

describe("Live Font Audit across all 20 font files in public/fonts", () => {
  const fontDir = "public/fonts";
  const families = ["Arimo", "Tinos", "Cousine", "Carlito", "Caladea"];
  const styles = ["Regular", "Bold", "Italic", "BoldItalic"];
  const allCodes = getAllLanguageCodes();

  // Map of parsed font coverage
  const parsedFonts = new Map<string, Set<number>>();

  beforeAll(() => {
    for (const family of families) {
      for (const style of styles) {
        const fileName = `${family}-${style}.ttf`;
        const filePath = path.join(fontDir, fileName);
        const bytes = fs.readFileSync(filePath);
        const glyphs = readFontGlyphCoverage(bytes);
        parsedFonts.set(fileName, glyphs);
      }
    }
  });

  it("successfully parses all 20 font files without error", () => {
    expect(parsedFonts.size).toBe(20);
    for (const [name, glyphs] of parsedFonts.entries()) {
      expect(glyphs.size, `${name} glyph count`).toBeGreaterThan(400);
    }
  });

  it("verifies Arimo covers all 9 languages in all 4 styles", () => {
    for (const style of styles) {
      const fileName = `Arimo-${style}.ttf`;
      const glyphs = parsedFonts.get(fileName)!;
      for (const code of allCodes) {
        const profile = getLanguageProfile(code)!;
        const res = checkCharacterCoverage(glyphs, profile.requiredCharacters);
        expect(res.ok, `Arimo-${style} should cover ${code} (${profile.nativeName})`).toBe(true);
      }
    }
  });

  it("verifies Tinos covers all 9 languages in all 4 styles", () => {
    for (const style of styles) {
      const fileName = `Tinos-${style}.ttf`;
      const glyphs = parsedFonts.get(fileName)!;
      for (const code of allCodes) {
        const profile = getLanguageProfile(code)!;
        const res = checkCharacterCoverage(glyphs, profile.requiredCharacters);
        expect(res.ok, `Tinos-${style} should cover ${code}`).toBe(true);
      }
    }
  });

  it("verifies Cousine covers all 9 languages in all 4 styles", () => {
    for (const style of styles) {
      const fileName = `Cousine-${style}.ttf`;
      const glyphs = parsedFonts.get(fileName)!;
      for (const code of allCodes) {
        const profile = getLanguageProfile(code)!;
        const res = checkCharacterCoverage(glyphs, profile.requiredCharacters);
        expect(res.ok, `Cousine-${style} should cover ${code}`).toBe(true);
      }
    }
  });

  it("verifies Carlito covers all 9 languages in all 4 styles", () => {
    for (const style of styles) {
      const fileName = `Carlito-${style}.ttf`;
      const glyphs = parsedFonts.get(fileName)!;
      for (const code of allCodes) {
        const profile = getLanguageProfile(code)!;
        const res = checkCharacterCoverage(glyphs, profile.requiredCharacters);
        expect(res.ok, `Carlito-${style} should cover ${code}`).toBe(true);
      }
    }
  });

  it("verifies Caladea covers pl, cs, and tr in all 4 styles", () => {
    for (const style of styles) {
      const fileName = `Caladea-${style}.ttf`;
      const glyphs = parsedFonts.get(fileName)!;
      for (const code of ["pl", "cs", "tr"] as LanguageCode[]) {
        const profile = getLanguageProfile(code)!;
        const res = checkCharacterCoverage(glyphs, profile.requiredCharacters);
        expect(res.ok, `Caladea-${style} should cover ${code}`).toBe(true);
      }
    }
  });

  it("verifies Caladea FAILS ru, uk, bg, sr, el, and vi in all 4 styles", () => {
    const failingCodes: LanguageCode[] = ["ru", "uk", "bg", "sr", "el", "vi"];
    for (const style of styles) {
      const fileName = `Caladea-${style}.ttf`;
      const glyphs = parsedFonts.get(fileName)!;
      for (const code of failingCodes) {
        const profile = getLanguageProfile(code)!;
        const res = checkCharacterCoverage(glyphs, profile.requiredCharacters);
        expect(res.ok, `Caladea-${style} must FAIL ${code}`).toBe(false);
        expect(res.missing.length).toBeGreaterThan(0);
      }
    }
  });

  it("verifies Caladea is excluded from allowedFontFamilies for ru, uk, bg, sr, el, vi", () => {
    const failingCodes: LanguageCode[] = ["ru", "uk", "bg", "sr", "el", "vi"];
    for (const code of failingCodes) {
      const profile = getLanguageProfile(code)!;
      expect(profile.allowedFontFamilies).not.toContain("caladea");
      expect(profile.allowedFontFamilies).toEqual(["arimo", "tinos", "cousine", "carlito"]);
    }

    const passingCodes: LanguageCode[] = ["pl", "cs", "tr"];
    for (const code of passingCodes) {
      const profile = getLanguageProfile(code)!;
      expect(profile.allowedFontFamilies).toContain("caladea");
    }
  });
});
