import { describe, expect, it } from "vitest";
import {
  containsUnsupportedScript,
  UNSUPPORTED_SCRIPT_MESSAGE,
} from "./scriptSupport";
import { useEditor, planReflow } from "../store";
import type { PageItem, PageObject, TextObject } from "./types";

describe("scriptSupport - Prompt 3M script detection", () => {
  it("has the exact required unsupported script message", () => {
    expect(UNSUPPORTED_SCRIPT_MESSAGE).toBe("Editing this script is not supported yet.");
  });

  describe("detects unsupported scripts", () => {
    it("detects Arabic text", () => {
      expect(containsUnsupportedScript("مرحبا")).toBe(true);
      expect(containsUnsupportedScript("في صباح استيقظ أحمد مبكرا")).toBe(true);
      expect(containsUnsupportedScript("كتاب")).toBe(true);
      // Arabic presentation forms
      expect(containsUnsupportedScript("\uFE8E\uFE8F")).toBe(true);
    });

    it("detects Hebrew text", () => {
      expect(containsUnsupportedScript("שלום עולם")).toBe(true);
      expect(containsUnsupportedScript("עִבְרִית")).toBe(true);
      expect(containsUnsupportedScript("תודה רבה")).toBe(true);
    });

    it("detects Devanagari text", () => {
      expect(containsUnsupportedScript("नमस्ते")).toBe(true);
      expect(containsUnsupportedScript("हिन्दी")).toBe(true);
      expect(containsUnsupportedScript("देवनागरी लिपि")).toBe(true);
    });

    it("detects Thai text", () => {
      expect(containsUnsupportedScript("สวัสดี")).toBe(true);
      expect(containsUnsupportedScript("ภาษาไทย")).toBe(true);
      expect(containsUnsupportedScript("ขอบคุณ")).toBe(true);
    });

    it("detects Chinese characters (Han)", () => {
      expect(containsUnsupportedScript("你好世界")).toBe(true);
      expect(containsUnsupportedScript("中文编辑")).toBe(true);
      expect(containsUnsupportedScript("文档测试")).toBe(true);
    });

    it("detects Japanese characters (Hiragana, Katakana, Kanji)", () => {
      expect(containsUnsupportedScript("こんにちは")).toBe(true); // Hiragana
      expect(containsUnsupportedScript("カタカナ")).toBe(true); // Katakana
      expect(containsUnsupportedScript("日本語テスト")).toBe(true); // Kanji + Katakana
      expect(containsUnsupportedScript("ありがとう")).toBe(true);
    });

    it("detects Korean characters (Hangul syllables and jamo)", () => {
      expect(containsUnsupportedScript("안녕하세요")).toBe(true); // Hangul syllables
      expect(containsUnsupportedScript("한국어 문서")).toBe(true);
      expect(containsUnsupportedScript("ㅎㅇ")).toBe(true); // Hangul compatibility jamo
    });

    it("detects mixed text containing unsupported scripts alongside English", () => {
      expect(containsUnsupportedScript("Section 1: مقدمة")).toBe(true);
      expect(containsUnsupportedScript("Welcome - שלום")).toBe(true);
      expect(containsUnsupportedScript("Hello (你好)")).toBe(true);
      expect(containsUnsupportedScript("Item #4: 日本語")).toBe(true);
      expect(containsUnsupportedScript("Price: 100 ฿ (สวัสดี)")).toBe(true);
      expect(containsUnsupportedScript("Chapter 2: नमस्ते")).toBe(true);
      expect(containsUnsupportedScript("File: 한국어.pdf")).toBe(true);
    });
  });

  describe("allows supported Latin and Western scripts", () => {
    it("allows standard English sentences, numbers, and punctuation", () => {
      expect(containsUnsupportedScript("Hello world")).toBe(false);
      expect(containsUnsupportedScript("Folio PDF Editor is fast and local.")).toBe(false);
      expect(containsUnsupportedScript("1234567890 !@#$%^&*()_+-=[]{}|;':,./<>?")).toBe(false);
      expect(containsUnsupportedScript("Invoice #INV-2024-001")).toBe(false);
      expect(containsUnsupportedScript("Total Amount Due: $1,250.00")).toBe(false);
    });

    it("allows Latin script with Western diacritics and accents", () => {
      expect(containsUnsupportedScript("Café au lait")).toBe(false);
      expect(containsUnsupportedScript("München Über")).toBe(false);
      expect(containsUnsupportedScript("Señor Gómez")).toBe(false);
      expect(containsUnsupportedScript("Voix ambiguë d'un cœur")).toBe(false);
    });

    it("handles empty or null inputs gracefully without false positives", () => {
      expect(containsUnsupportedScript("")).toBe(false);
      expect(containsUnsupportedScript(null)).toBe(false);
      expect(containsUnsupportedScript(undefined)).toBe(false);
      expect(containsUnsupportedScript("   ")).toBe(false);
    });
  });
});

describe("Store guard - preventing modifications to unsupported script text", () => {
  const pageId = "test-page-1";

  function setupStoreWithObject(obj: PageObject) {
    const page: PageItem = {
      id: pageId,
      sourceId: "source-1",
      sourcePageIndex: 0,
      rotation: 0,
      width: 600,
      height: 800,
      annotations: [],
      editVersion: 0,
    };

    useEditor.setState({
      status: "ready",
      pages: [page],
      pageObjects: {
        [pageId]: [obj],
      },
      selectedObject: { pageId, index: obj.index },
    });
  }

  it("blocks editObjectText when the target text object contains Arabic", async () => {
    const arabicObj: PageObject = {
      index: 0,
      parts: [0],
      type: "text",
      text: "في صباح استيقظ أحمد",
      fontSize: 12,
      fontName: "Times-Roman",
      color: { r: 0, g: 0, b: 0, a: 255 },
      bbox: { left: 10, right: 100, bottom: 20, top: 40 },
      origin: { x: 10, y: 20 },
      dir: { x: 1, y: 0 },
    };

    setupStoreWithObject(arabicObj);

    const store = useEditor.getState();
    const resultIndex = await store.editObjectText(pageId, 0, "Modified text");

    // Must return the index without mutating or proceeding
    expect(resultIndex).toBe(0);

    // Object in store remains untouched
    const currentObj = useEditor.getState().pageObjects[pageId][0];
    expect(currentObj.text).toBe("في صباح استيقظ أحمد");
  });

  it("blocks editObjectText when the replacement text introduces an unsupported script", async () => {
    const englishObj: PageObject = {
      index: 1,
      parts: [1],
      type: "text",
      text: "Original English text",
      fontSize: 12,
      fontName: "Helvetica",
      color: { r: 0, g: 0, b: 0, a: 255 },
      bbox: { left: 10, right: 100, bottom: 20, top: 40 },
      origin: { x: 10, y: 20 },
      dir: { x: 1, y: 0 },
    };

    setupStoreWithObject(englishObj);

    const store = useEditor.getState();
    const resultIndex = await store.editObjectText(pageId, 1, "Trying to write שלום (Hebrew)");

    expect(resultIndex).toBe(1);

    const currentObj = useEditor.getState().pageObjects[pageId][0];
    expect(currentObj.text).toBe("Original English text");
  });

  it("blocks setObjectFontName when the target text contains an unsupported script", async () => {
    const cjkObj: PageObject = {
      index: 2,
      parts: [2],
      type: "text",
      text: "中文测试",
      fontSize: 12,
      fontName: "STSong-Light",
      color: { r: 0, g: 0, b: 0, a: 255 },
      bbox: { left: 10, right: 100, bottom: 20, top: 40 },
      origin: { x: 10, y: 20 },
      dir: { x: 1, y: 0 },
    };

    setupStoreWithObject(cjkObj);

    const store = useEditor.getState();
    // Attempt to replace font with Helvetica
    await store.setObjectFontName(pageId, 2, "Helvetica");

    // The text object must remain intact and unchanged
    const currentObj = useEditor.getState().pageObjects[pageId][0];
    expect(currentObj.text).toBe("中文测试");
    expect(currentObj.fontName).toBe("STSong-Light");
  });

  it("fail-closed: editObjectText rejects edit when pageObjects entry is missing (cache miss)", async () => {
    useEditor.setState({
      status: "ready",
      pages: [
        {
          id: pageId,
          sourceId: "source-1",
          sourcePageIndex: 0,
          rotation: 0,
          width: 600,
          height: 800,
          annotations: [],
          editVersion: 0,
        },
      ],
      pageObjects: {}, // Cache miss
      selectedObject: null,
      past: [],
    });

    const store = useEditor.getState();
    const resultIndex = await store.editObjectText(pageId, 0, "English replacement text");

    // Rejected fail-closed without mutating
    expect(resultIndex).toBe(0);
    expect(useEditor.getState().pages[0].editVersion).toBe(0);
    expect(useEditor.getState().past.length).toBe(0);
  });

  it("blocks deleteObject when the target is an unsupported script text object", async () => {
    const arabicObj: PageObject = {
      index: 0,
      parts: [0],
      type: "text",
      text: "في صباح استيقظ أحمد",
      fontSize: 12,
      fontName: "Times-Roman",
      color: { r: 0, g: 0, b: 0, a: 255 },
      bbox: { left: 10, right: 100, bottom: 20, top: 40 },
      origin: { x: 10, y: 20 },
      dir: { x: 1, y: 0 },
    };

    setupStoreWithObject(arabicObj);

    const store = useEditor.getState();
    await store.deleteObject(pageId, 0);

    // Arabic text object remains intact
    expect(useEditor.getState().pageObjects[pageId]).toHaveLength(1);
    expect(useEditor.getState().pageObjects[pageId][0].text).toBe("في صباح استيقظ أحمد");
    expect(useEditor.getState().pages[0].editVersion).toBe(0);
  });

  it("planReflow rejects a paragraph containing an unsupported-script line even when other lines are English", async () => {
    const BLACK = { r: 0, g: 0, b: 0, a: 255 };
    const createLine = (index: number, text: string, y: number): TextObject => ({
      index,
      parts: [index],
      type: "text",
      text,
      fontSize: 10,
      fontName: "Helvetica",
      color: BLACK,
      origin: { x: 0, y },
      dir: { x: 1, y: 0 },
      bbox: { left: 0, right: 100, bottom: y - 2, top: y + 7 },
    });

    const lines = [
      createLine(0, "First line in English", 200),
      createLine(1, "في صباح استيقظ أحمد", 188),
      createLine(2, "Third line in English", 176),
    ];

    useEditor.setState({
      status: "ready",
      pages: [
        {
          id: pageId,
          sourceId: "source-1",
          sourcePageIndex: 0,
          rotation: 0,
          width: 600,
          height: 800,
          annotations: [],
          editVersion: 0,
        },
      ],
      pageObjects: {
        [pageId]: lines,
      },
      selectedObject: { pageId, index: 0 },
    });

    // Paragraph reflow must be rejected for any line in this paragraph
    const planFromEnglish0 = await planReflow(useEditor.getState, pageId, 0, "Modified first line");
    expect(planFromEnglish0).toBeNull();

    const planFromArabic1 = await planReflow(useEditor.getState, pageId, 1, "Modified second line");
    expect(planFromArabic1).toBeNull();

    const planFromEnglish2 = await planReflow(useEditor.getState, pageId, 2, "Modified third line");
    expect(planFromEnglish2).toBeNull();
  });
});
