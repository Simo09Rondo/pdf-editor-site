"use client";

import { settleTextEdits, useEditor } from "@/lib/store";
import { downloadBlob } from "@/lib/utils";

/**
 * Build a PDF from the current document in memory and return its bytes.
 * Does NOT trigger any browser downloads.
 */
export async function exportPdfBytes(opts?: {
  pageIds?: string[];
}): Promise<Uint8Array> {
  // Typed text is applied a frame or more after the keystroke, and a commit can
  // still be running from the blur that clicking Export just caused. Both have
  // to land on the live document before it is saved below, or the file would
  // silently miss the last words typed.
  await settleTextEdits();
  const { buildPdf } = await import("@/lib/pdf/save");
  const { getPdfiumDoc } = await import("@/lib/pdf/pdfium/registry");
  const { pages, sources, sourceBytes: storeSourceBytes } = useEditor.getState();

  const selected = opts?.pageIds
    ? pages.filter((p) => opts.pageIds!.includes(p.id))
    : pages;
  if (selected.length === 0) throw new Error("No pages to export.");

  const sourceBytes: Record<string, Uint8Array> = {};
  for (const id of Object.keys(sources)) {
    const docP = getPdfiumDoc(id);
    if (docP) {
      try {
        const doc = await docP;
        const saved = doc.save();
        if (saved && saved.byteLength > 0) {
          sourceBytes[id] = saved;
        } else if (storeSourceBytes[id] && storeSourceBytes[id].byteLength > 0) {
          sourceBytes[id] = storeSourceBytes[id];
        } else {
          sourceBytes[id] = sources[id].bytes;
        }
      } catch {
        sourceBytes[id] = storeSourceBytes[id] ?? sources[id].bytes;
      }
    } else if (storeSourceBytes[id] && storeSourceBytes[id].byteLength > 0) {
      sourceBytes[id] = storeSourceBytes[id];
    } else {
      sourceBytes[id] = sources[id].bytes;
    }
  }

  const bytes = await buildPdf({ pages: selected, sourceBytes });
  if (!bytes || bytes.byteLength === 0) {
    throw new Error("Exported PDF data is empty (0 bytes).");
  }
  return bytes;
}

/**
 * Build a PDF from the current document and download it. Pass `pageIds` to
 * export only a subset (in the current page order) - this powers page
 * split/extract; omit it to export the whole document.
 *
 * Two-stage assembly (same as a full export): PDFium bakes any existing-content
 * edits into each source's bytes, then pdf-lib rebuilds the chosen page order,
 * applies rotation and paints overlay annotations.
 *
 * Returns the downloaded file name.
 */
export async function exportPdf(opts?: {
  pageIds?: string[];
  suffix?: string;
}): Promise<string> {
  const bytes = await exportPdfBytes(opts);
  // Copy into a plain ArrayBuffer so the Blob is backed by exactly these bytes.
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);

  const { fileName } = useEditor.getState();
  const base = fileName.replace(/\.pdf$/i, "") || "document";
  const name = `${base}${opts?.suffix ?? "-edited"}.pdf`;
  downloadBlob(new Blob([ab], { type: "application/pdf" }), name);
  return name;
}

