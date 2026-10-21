import { describe, it, expect } from "vitest";
import {
  stripSubsetPrefix,
  detectFontStyle,
  detectFont,
} from "./fontDetection";

describe("stripSubsetPrefix", () => {
  it("removes 6-letter subset prefix like ABCDEF+", () => {
    expect(stripSubsetPrefix("ABCDEF+Arial")).toBe("Arial");
    expect(stripSubsetPrefix("AAAAAA+AlexBrush-Regular")).toBe("AlexBrush-Regular");
    expect(stripSubsetPrefix("BCDEEE+ArialMT")).toBe("ArialMT");
  });

  it("leaves font names without a subset prefix unchanged", () => {
    expect(stripSubsetPrefix("ArialMT")).toBe("ArialMT");
    expect(stripSubsetPrefix("TimesNewRoman")).toBe("TimesNewRoman");
  });
});

describe("detectFontStyle", () => {
  it("detects bold and italic words", () => {
    expect(detectFontStyle("Arial-Bold").style).toBe("bold");
    expect(detectFontStyle("Arial-BoldMT").style).toBe("bold");
    expect(detectFontStyle("Helvetica-Oblique").style).toBe("italic");
    expect(detectFontStyle("TimesNewRomanPS-ItalicMT").style).toBe("italic");
    expect(detectFontStyle("Helvetica-BoldOblique").style).toBe("boldItalic");
    expect(detectFontStyle("TimesNewRomanPS-BoldItalicMT").style).toBe("boldItalic");
    expect(detectFontStyle("Calibri").style).toBe("regular");
  });
});

describe("detectFont", () => {
  it("maps Arial, ArialMT, Helvetica to Arimo", () => {
    const resArial = detectFont("ArialMT");
    expect(resArial.replacementFamily).toBe("Arimo");
    expect(resArial.matchedFamily).toBe("Arial");
    expect(resArial.displayText).toBe(
      "Original font: ArialMT. Replacement: Arimo (matches Arial)."
    );

    const resSubset = detectFont("BCDEEE+ArialMT");
    expect(resSubset.replacementFamily).toBe("Arimo");
    expect(resSubset.matchedFamily).toBe("Arial");
    expect(resSubset.displayText).toBe(
      "Original font: BCDEEE+ArialMT. Replacement: Arimo (matches Arial)."
    );

    const resHelv = detectFont("Helvetica-Bold");
    expect(resHelv.replacementFamily).toBe("Arimo");
    expect(resHelv.matchedFamily).toBe("Helvetica");
    expect(resHelv.isBold).toBe(true);
    expect(resHelv.displayText).toBe(
      "Original font: Helvetica-Bold. Replacement: Arimo (matches Helvetica)."
    );
  });

  it("maps Times, TimesNewRoman, TimesNewRomanPS, TimesNewRomanPSMT to Tinos", () => {
    const res1 = detectFont("TimesNewRoman");
    expect(res1.replacementFamily).toBe("Tinos");
    expect(res1.matchedFamily).toBe("Times New Roman");
    expect(res1.displayText).toBe(
      "Original font: TimesNewRoman. Replacement: Tinos (matches Times New Roman)."
    );

    const res2 = detectFont("TimesNewRomanPSMT");
    expect(res2.replacementFamily).toBe("Tinos");
    expect(res2.matchedFamily).toBe("Times New Roman");

    const res3 = detectFont("Times-Roman");
    expect(res3.replacementFamily).toBe("Tinos");
    expect(res3.matchedFamily).toBe("Times");
  });

  it("maps Courier, CourierNew, CourierNewPSMT to Cousine", () => {
    const res1 = detectFont("CourierNewPSMT");
    expect(res1.replacementFamily).toBe("Cousine");
    expect(res1.matchedFamily).toBe("Courier New");
    expect(res1.displayText).toBe(
      "Original font: CourierNewPSMT. Replacement: Cousine (matches Courier New)."
    );

    const res2 = detectFont("Courier-Bold");
    expect(res2.replacementFamily).toBe("Cousine");
    expect(res2.matchedFamily).toBe("Courier");
  });

  it("maps Calibri to Carlito and Cambria to Caladea", () => {
    const resCalibri = detectFont("Calibri");
    expect(resCalibri.replacementFamily).toBe("Carlito");
    expect(resCalibri.matchedFamily).toBe("Calibri");
    expect(resCalibri.displayText).toBe(
      "Original font: Calibri. Replacement: Carlito (matches Calibri)."
    );

    const resCambria = detectFont("Cambria");
    expect(resCambria.replacementFamily).toBe("Caladea");
    expect(resCambria.matchedFamily).toBe("Cambria");
    expect(resCambria.displayText).toBe(
      "Original font: Cambria. Replacement: Caladea (matches Cambria)."
    );
  });

  it("falls back to flags for unknown fonts", () => {
    // FixedPitch flag (bit 1 = 1)
    const resMono = detectFont("UnknownCodeFont", 1);
    expect(resMono.replacementFamily).toBe("Cousine");
    expect(resMono.matchedFamily).toBe("Courier New");

    // Serif flag (bit 2 = 2)
    const resSerif = detectFont("UnknownBookFont", 2);
    expect(resSerif.replacementFamily).toBe("Tinos");
    expect(resSerif.matchedFamily).toBe("Times New Roman");

    // Neither flag -> defaults to Arimo
    const resDefault = detectFont("UnknownSansFont", 32);
    expect(resDefault.replacementFamily).toBe("Arimo");
    expect(resDefault.matchedFamily).toBe("Arial");
  });
});
