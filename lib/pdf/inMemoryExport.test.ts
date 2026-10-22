import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import { buildPdf } from "./save";
import * as utils from "../utils";
import type { PageItem } from "./types";

describe("in-memory export and buildPdf", () => {
  it("buildPdf preserves single source document bytes directly when no annotations or rotations exist", async () => {
    const originalBytes = fs.readFileSync("public/test-pdfs/01-arial-letter.pdf.pdf");
    const sourceId = "source-1";

    const pages: PageItem[] = [
      {
        id: "p1",
        sourceId,
        sourcePageIndex: 0,
        rotation: 0,
        width: 612,
        height: 792,
        annotations: [],
        editVersion: 0,
      },
    ];

    const result = await buildPdf({
      pages,
      sourceBytes: { [sourceId]: originalBytes },
    });

    expect(result).toBeDefined();
    expect(result.byteLength).toBe(originalBytes.byteLength);
    // Byte-for-byte exact preservation of PDF structure
    expect(result).toEqual(originalBytes);
  });

  it("exporting in memory never invokes downloadBlob or creates download links", async () => {
    const downloadSpy = vi.spyOn(utils, "downloadBlob");

    const originalBytes = fs.readFileSync("public/test-pdfs/01-arial-letter.pdf.pdf");
    const pages: PageItem[] = [
      {
        id: "p1",
        sourceId: "source-test",
        sourcePageIndex: 0,
        rotation: 0,
        width: 612,
        height: 792,
        annotations: [],
        editVersion: 0,
      },
    ];

    const bytes = await buildPdf({
      pages,
      sourceBytes: { "source-test": originalBytes },
    });

    expect(downloadSpy).not.toHaveBeenCalled();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBeGreaterThan(0);
    // Verifies PDF header %PDF-
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe("%PDF-");

    downloadSpy.mockRestore();
  });

  it("buildPdf round-trip for 10-arabic-page.pdf preserves document bytes directly without modifications", async () => {
    const originalBytes = fs.readFileSync("public/test-pdfs/10-arabic-page.pdf.pdf");
    const sourceId = "source-arabic";

    const pages: PageItem[] = [
      {
        id: "p-arabic",
        sourceId,
        sourcePageIndex: 0,
        rotation: 0,
        width: 595,
        height: 842,
        annotations: [],
        editVersion: 0,
      },
    ];

    const result = await buildPdf({
      pages,
      sourceBytes: { [sourceId]: originalBytes },
    });

    expect(result).toBeDefined();
    expect(result.byteLength).toBe(originalBytes.byteLength);
    // Preserves identical original bytes when opened and exported without edits
    expect(result).toEqual(originalBytes);
  });
});
