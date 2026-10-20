import { useState, useEffect, useCallback, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RefreshCw,
  FileText,
  Activity,
  Eye,
  X,
  ArrowLeft,
} from "lucide-react";
import { useEditor, settleTextEdits } from "@/lib/store";
import { PdfiumDoc } from "@/lib/pdf/pdfium/doc";

export interface TestResult {
  fileName: string;
  originalImage: string;
  editedImage: string;
  diffImage?: string;
  percentChanged: number;
  status: "passed" | "failed" | "scanned" | "pending" | "running";
  errorMessage: string | null;
  isScanned: boolean;
  originalText?: string;
  editedText?: string;
  totalOutsidePixels?: number;
  changedOutsidePixels?: number;
  durationMs?: number;
}

export function AccuracyLab() {
  const [manifest, setManifest] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [currentTesting, setCurrentTesting] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [filter, setFilter] = useState<"all" | "passed" | "failed" | "scanned">("all");
  const abortRef = useRef(false);

  // Set page title and robots meta tag
  useEffect(() => {
    document.title = "Accuracy Lab · Folio";
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = "noindex, nofollow";
  }, []);

  // Fetch manifest on mount
  useEffect(() => {
    async function loadManifest() {
      try {
        const res = await fetch("/test-pdfs/manifest.json");
        if (!res.ok) throw new Error(`Could not load manifest.json (${res.status})`);
        const files: string[] = await res.json();
        setManifest(files);
        // Initialize results placeholders
        const initial: Record<string, TestResult> = {};
        for (const file of files) {
          initial[file] = {
            fileName: file,
            originalImage: "",
            editedImage: "",
            percentChanged: 0,
            status: "pending",
            errorMessage: null,
            isScanned: false,
          };
        }
        setResults(initial);
      } catch (err) {
        console.error("Failed to load test PDFs manifest:", err);
      }
    }
    void loadManifest();
  }, []);

  const runSingleTest = useCallback(async (fileName: string): Promise<TestResult> => {
    const startTime = performance.now();
    try {
      // 1. Fetch file bytes via secure internal endpoint (octet-stream to prevent IDM / extension interception)
      let res = await fetch(`/api/test-pdf?file=${encodeURIComponent(fileName)}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      if (!res.ok) {
        res = await fetch(`/test-pdfs/${encodeURIComponent(fileName)}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch file`);
      const arrayBuffer = await res.arrayBuffer();
      const origBytes = new Uint8Array(arrayBuffer);

      // 2. Render original Page 1 with PDFium
      const origDoc = await PdfiumDoc.load(origBytes);
      const origCanvas = document.createElement("canvas");
      const origSize = origDoc.renderPageToCanvas(0, origCanvas, 1.0);
      const origCtx = origCanvas.getContext("2d")!;
      const origImgData = origCtx.getImageData(0, 0, origCanvas.width, origCanvas.height);
      const originalImage = origCanvas.toDataURL("image/png");
      origDoc.close();

      // 3. Load into editor store using the editor's normal load code
      useEditor.getState().reset();
      const file = new File([origBytes], fileName, { type: "application/pdf" });
      await useEditor.getState().loadFile(file);

      const state = useEditor.getState();
      if (state.status === "error") {
        throw new Error(state.error || "Editor failed to load document");
      }
      if (state.status === "password" || state.pendingLoad) {
        throw new Error("Password protected PDF (cannot edit without password)");
      }

      const page = state.pages[0];
      if (!page) throw new Error("Document has no pages");

      // 4. Refresh objects on Page 1 using the editor's normal method
      await useEditor.getState().refreshObjects(page.id);
      const objects = useEditor.getState().pageObjects[page.id] || [];

      // Find first text object
      const firstText = objects.find(
        (o) => o.type === "text" && o.text && o.text.trim().length > 0,
      );

      // If no text objects found, it's a scanned/image-only PDF
      if (!firstText) {
        useEditor.getState().reset();
        return {
          fileName,
          originalImage,
          editedImage: originalImage,
          percentChanged: 0,
          status: "scanned",
          errorMessage: "Scanned PDF: no text objects found on page 1",
          isScanned: true,
          durationMs: Math.round(performance.now() - startTime),
        };
      }

      // 5. Replace last word with "TEST"
      const originalText = firstText.text.trim();
      const words = originalText.split(/\s+/);
      words[words.length - 1] = "TEST";
      const editedText = words.join(" ");

      const origBbox = { ...firstText.bbox };

      // 6. Apply edit using the editor's normal editObjectText method
      await useEditor.getState().editObjectText(page.id, firstText.index, editedText, {
        reflow: true,
      });
      await settleTextEdits();

      // Check for editor toast errors
      const postEditState = useEditor.getState();
      if (postEditState.toast?.kind === "error") {
        throw new Error(postEditState.toast.message);
      }

      // 7. Export result in memory using the editor's normal save pipeline (no browser download)
      const { exportPdfBytes } = await import("@/lib/pdf/exportDocument");
      const exportedBytes = await exportPdfBytes();
      if (!exportedBytes || exportedBytes.byteLength === 0) {
        throw new Error("Exported PDF data is empty (0 bytes)");
      }

      // 8. Render EDITED Page 1 with PDFium at the exact same scale
      const editedDoc = await PdfiumDoc.load(exportedBytes);
      const editedCanvas = document.createElement("canvas");
      editedDoc.renderPageToCanvas(0, editedCanvas, 1.0);
      const editedCtx = editedCanvas.getContext("2d")!;
      const editedImgData = editedCtx.getImageData(0, 0, editedCanvas.width, editedCanvas.height);
      const editedImage = editedCanvas.toDataURL("image/png");
      editedDoc.close();

      // Clean up editor store after export and rendering are complete
      useEditor.getState().reset();

      // 9. Compare pixel-by-pixel, ignoring the edited line's bounding box
      const pw = origCanvas.width;
      const ph = origCanvas.height;

      // Coordinate scaling from PDF user space (bottom-left) to canvas pixels (top-left)
      const scaleX = pw / origSize.width;
      const scaleY = ph / origSize.height;

      const canvasLeft = Math.floor(origBbox.left * scaleX);
      const canvasRight = Math.ceil(origBbox.right * scaleX);
      const canvasTop = Math.floor((origSize.height - origBbox.top) * scaleY);
      const canvasBottom = Math.ceil((origSize.height - origBbox.bottom) * scaleY);

      const minX = Math.min(canvasLeft, canvasRight);
      const maxX = Math.max(canvasLeft, canvasRight);
      const minY = Math.min(canvasTop, canvasBottom);
      const maxY = Math.max(canvasTop, canvasBottom);

      // Padding of 12 pixels around the edited line's bounding box
      const padX = 12;
      const padY = 12;

      let totalOutside = 0;
      let changedOutside = 0;

      const d1 = origImgData.data;
      const d2 = editedImgData.data;

      // Create diff visualization canvas
      const diffCanvas = document.createElement("canvas");
      diffCanvas.width = pw;
      diffCanvas.height = ph;
      const diffCtx = diffCanvas.getContext("2d")!;
      const diffImgData = diffCtx.createImageData(pw, ph);
      const dd = diffImgData.data;

      for (let y = 0; y < ph; y++) {
        const insideY = y >= minY - padY && y <= maxY + padY;
        for (let x = 0; x < pw; x++) {
          const idx = (y * pw + x) * 4;
          const insideBox = insideY && x >= minX - padX && x <= maxX + padX;

          if (insideBox) {
            // Ignored box overlay (tint blue)
            dd[idx] = 99;
            dd[idx + 1] = 102;
            dd[idx + 2] = 241;
            dd[idx + 3] = 130;
            continue;
          }

          totalOutside++;
          const dr = Math.abs(d1[idx] - d2[idx]);
          const dg = Math.abs(d1[idx + 1] - d2[idx + 1]);
          const db = Math.abs(d1[idx + 2] - d2[idx + 2]);
          const da = Math.abs(d1[idx + 3] - d2[idx + 3]);

          // Tolerance threshold of 25 to accommodate minor anti-aliasing jitter
          if (dr + dg + db + da > 25) {
            changedOutside++;
            // Flagged changed pixel: bright red
            dd[idx] = 239;
            dd[idx + 1] = 68;
            dd[idx + 2] = 68;
            dd[idx + 3] = 255;
          } else {
            // Unchanged: subdued original grayscale
            const lum = Math.round(d1[idx] * 0.299 + d1[idx + 1] * 0.587 + d1[idx + 2] * 0.114);
            dd[idx] = lum;
            dd[idx + 1] = lum;
            dd[idx + 2] = lum;
            dd[idx + 3] = 65;
          }
        }
      }

      diffCtx.putImageData(diffImgData, 0, 0);
      const diffImage = diffCanvas.toDataURL("image/png");

      const percentChanged = totalOutside > 0 ? (changedOutside / totalOutside) * 100 : 0;
      // Pass condition: no error and under 0.5% pixels changed outside the edited line
      const passed = percentChanged < 0.5;

      return {
        fileName,
        originalImage,
        editedImage,
        diffImage,
        percentChanged: Number(percentChanged.toFixed(3)),
        status: passed ? "passed" : "failed",
        errorMessage: passed
          ? null
          : `Pixel drift exceeded threshold: ${percentChanged.toFixed(3)}% > 0.5%`,
        isScanned: false,
        originalText,
        editedText,
        totalOutsidePixels: totalOutside,
        changedOutsidePixels: changedOutside,
        durationMs: Math.round(performance.now() - startTime),
      };
    } catch (err: unknown) {
      useEditor.getState().reset();
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        fileName,
        originalImage: "",
        editedImage: "",
        percentChanged: 100,
        status: "failed",
        errorMessage: errorMsg,
        isScanned: false,
        durationMs: Math.round(performance.now() - startTime),
      };
    }
  }, []);

  const runAllTests = useCallback(async () => {
    if (isRunning || manifest.length === 0) return;
    setIsRunning(true);
    abortRef.current = false;

    for (const file of manifest) {
      if (abortRef.current) break;
      setCurrentTesting(file);
      setResults((prev) => ({
        ...prev,
        [file]: {
          ...(prev[file] || {
            fileName: file,
            originalImage: "",
            editedImage: "",
            percentChanged: 0,
            errorMessage: null,
            isScanned: false,
          }),
          status: "running",
        },
      }));

      const res = await runSingleTest(file);
      setResults((prev) => ({
        ...prev,
        [file]: res,
      }));
    }

    setCurrentTesting(null);
    setIsRunning(false);
  }, [isRunning, manifest, runSingleTest]);

  // Statistics
  const resultList = manifest.map((f) => results[f]).filter(Boolean);
  const total = resultList.length;
  const testedCount = resultList.filter((r) => r.status !== "pending").length;
  const passedCount = resultList.filter((r) => r.status === "passed").length;
  const failedCount = resultList.filter((r) => r.status === "failed").length;
  const scannedCount = resultList.filter((r) => r.isScanned).length;

  const filteredResults = resultList.filter((r) => {
    if (filter === "all") return true;
    if (filter === "passed") return r.status === "passed";
    if (filter === "failed") return r.status === "failed";
    if (filter === "scanned") return r.isScanned;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#06060a] text-foreground p-6 sm:p-10 font-sans">
      {/* Top Header */}
      <header className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 border-b border-[#2a2a30] gap-4">
        <div>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors px-2 py-1 rounded bg-[#141417] border border-[#2a2a30]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Editor
            </a>
            <span className="text-xs uppercase tracking-widest text-[#2dd4bf] font-mono bg-[#2dd4bf]/10 px-2 py-0.5 rounded border border-[#2dd4bf]/20">
              Hidden Test Harness
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2 flex items-center gap-2.5">
            <Activity className="h-7 w-7 text-[#6366f1]" />
            Accuracy Lab
          </h1>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Automated regression benchmark: edits line 1 on page 1 of each test PDF, exports the
            document in memory using standard editor code, and measures pixel drift against the
            original.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void runAllTests()}
            disabled={isRunning || manifest.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#6366f1] text-white font-medium text-sm hover:bg-[#4f46e5] disabled:opacity-50 transition-colors shadow-lg shadow-[#6366f1]/20 cursor-pointer"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Testing ({testedCount}/{total})...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                Run Accuracy Tests
              </>
            )}
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <section className="max-w-7xl mx-auto mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#141417] border border-[#2a2a30]">
          <div className="text-xs text-muted uppercase tracking-wider font-mono">Total PDFs</div>
          <div className="text-2xl font-bold mt-1 text-foreground">{total}</div>
          <div className="text-xs text-muted mt-1">Listed in manifest.json</div>
        </div>

        <div className="p-4 rounded-xl bg-[#141417] border border-emerald-500/30 bg-emerald-950/10">
          <div className="text-xs text-emerald-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Passed
          </div>
          <div className="text-2xl font-bold mt-1 text-emerald-400">
            {passedCount}{" "}
            <span className="text-xs font-normal text-muted">
              ({total > 0 ? Math.round((passedCount / total) * 100) : 0}%)
            </span>
          </div>
          <div className="text-xs text-muted mt-1">No error &lt; 0.5% drift</div>
        </div>

        <div className="p-4 rounded-xl bg-[#141417] border border-rose-500/30 bg-rose-950/10">
          <div className="text-xs text-rose-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5" /> Failed
          </div>
          <div className="text-2xl font-bold mt-1 text-rose-400">{failedCount}</div>
          <div className="text-xs text-muted mt-1">Errors or &ge; 0.5% drift</div>
        </div>

        <div className="p-4 rounded-xl bg-[#141417] border border-amber-500/30 bg-amber-950/10">
          <div className="text-xs text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Scanned
          </div>
          <div className="text-2xl font-bold mt-1 text-amber-400">{scannedCount}</div>
          <div className="text-xs text-muted mt-1">Image-only / no text</div>
        </div>
      </section>

      {/* Progress banner while running */}
      {isRunning && (
        <div className="max-w-7xl mx-auto mt-4 p-3 rounded-lg bg-[#6366f1]/10 border border-[#6366f1]/30 flex items-center justify-between text-xs text-[#6366f1]">
          <span className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Currently processing:{" "}
            <span className="font-mono font-bold text-foreground">{currentTesting}</span>
          </span>
          <span>
            {testedCount} of {total} completed
          </span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="max-w-7xl mx-auto mt-8 flex items-center gap-2 border-b border-[#2a2a30] pb-3">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === "all"
              ? "bg-[#1b1b1f] text-foreground border border-[#2a2a30]"
              : "text-muted hover:text-foreground"
          }`}
        >
          All ({total})
        </button>
        <button
          onClick={() => setFilter("passed")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === "passed"
              ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30"
              : "text-muted hover:text-foreground"
          }`}
        >
          Passed ({passedCount})
        </button>
        <button
          onClick={() => setFilter("failed")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === "failed"
              ? "bg-rose-950/40 text-rose-300 border border-rose-500/30"
              : "text-muted hover:text-foreground"
          }`}
        >
          Failed ({failedCount})
        </button>
        <button
          onClick={() => setFilter("scanned")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === "scanned"
              ? "bg-amber-950/40 text-amber-300 border border-amber-500/30"
              : "text-muted hover:text-foreground"
          }`}
        >
          Scanned ({scannedCount})
        </button>
      </div>

      {/* Results Table */}
      <div className="max-w-7xl mx-auto mt-4 bg-[#141417] border border-[#2a2a30] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#1b1b1f] text-muted text-xs uppercase tracking-wider font-mono border-b border-[#2a2a30]">
              <tr>
                <th className="py-3 px-4">PDF File</th>
                <th className="py-3 px-4">Status & Drift</th>
                <th className="py-3 px-4 text-center">Original Page 1</th>
                <th className="py-3 px-4 text-center">Edited Page 1</th>
                <th className="py-3 px-4">Edit Details</th>
                <th className="py-3 px-4 text-center">Scanned?</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a30]">
              {filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-muted">
                    No test files match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredResults.map((r) => {
                  const isPending = r.status === "pending";
                  const isCurrent = r.status === "running";
                  const isPassed = r.status === "passed";
                  const isFailed = r.status === "failed";
                  const isScanned = r.isScanned;

                  return (
                    <tr key={r.fileName} className="hover:bg-[#18181c] transition-colors">
                      {/* File Name */}
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted shrink-0" />
                          <span className="text-foreground font-medium truncate max-w-[200px]" title={r.fileName}>
                            {r.fileName}
                          </span>
                        </div>
                      </td>

                      {/* Status & Drift */}
                      <td className="py-3.5 px-4">
                        {isPending && <span className="text-xs text-muted">Not run yet</span>}
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#6366f1]">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Running...
                          </span>
                        )}
                        {isPassed && (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Passed
                            </span>
                            <span className="font-mono text-xs text-emerald-500">
                              {r.percentChanged}% changed
                            </span>
                          </div>
                        )}
                        {isFailed && (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
                              <XCircle className="h-3.5 w-3.5" /> Failed
                            </span>
                            <span className="font-mono text-xs text-rose-500">
                              {r.percentChanged}% changed
                            </span>
                          </div>
                        )}
                        {isScanned && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
                            <AlertTriangle className="h-3.5 w-3.5" /> Scanned
                          </span>
                        )}
                      </td>

                      {/* Original Thumbnail */}
                      <td className="py-3.5 px-4 text-center">
                        {r.originalImage ? (
                          <button
                            type="button"
                            onClick={() => setSelectedResult(r)}
                            className="inline-block border border-[#2a2a30] rounded overflow-hidden hover:border-[#6366f1] transition-colors cursor-pointer group relative"
                            title="Click to view full preview"
                          >
                            <img
                              src={r.originalImage}
                              alt="Original Page 1"
                              className="h-16 w-12 object-contain bg-white"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="h-3.5 w-3.5 text-white" />
                            </div>
                          </button>
                        ) : (
                          <div className="h-16 w-12 border border-dashed border-[#2a2a30] rounded mx-auto flex items-center justify-center text-muted text-[10px]">
                            -
                          </div>
                        )}
                      </td>

                      {/* Edited Thumbnail */}
                      <td className="py-3.5 px-4 text-center">
                        {r.editedImage ? (
                          <button
                            type="button"
                            onClick={() => setSelectedResult(r)}
                            className="inline-block border border-[#2a2a30] rounded overflow-hidden hover:border-[#6366f1] transition-colors cursor-pointer group relative"
                            title="Click to view full preview"
                          >
                            <img
                              src={r.editedImage}
                              alt="Edited Page 1"
                              className="h-16 w-12 object-contain bg-white"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="h-3.5 w-3.5 text-white" />
                            </div>
                          </button>
                        ) : (
                          <div className="h-16 w-12 border border-dashed border-[#2a2a30] rounded mx-auto flex items-center justify-center text-muted text-[10px]">
                            -
                          </div>
                        )}
                      </td>

                      {/* Edit Details */}
                      <td className="py-3.5 px-4">
                        {r.errorMessage ? (
                          <span className="text-xs text-rose-400 font-mono break-all max-w-xs block">
                            {r.errorMessage}
                          </span>
                        ) : r.originalText ? (
                          <div className="text-xs max-w-xs">
                            <div className="text-muted truncate" title={r.originalText}>
                              <span className="text-[10px] uppercase font-mono text-zinc-500">From: </span>
                              {r.originalText}
                            </div>
                            <div className="text-emerald-300 font-medium truncate mt-0.5" title={r.editedText}>
                              <span className="text-[10px] uppercase font-mono text-emerald-500">To: </span>
                              {r.editedText}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted">-</span>
                        )}
                      </td>

                      {/* Scanned Flag */}
                      <td className="py-3.5 px-4 text-center">
                        {r.isScanned ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Yes
                          </span>
                        ) : (
                          <span className="text-xs text-muted">No</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            setResults((prev) => ({
                              ...prev,
                              [r.fileName]: { ...r, status: "running" },
                            }));
                            const single = await runSingleTest(r.fileName);
                            setResults((prev) => ({
                              ...prev,
                              [r.fileName]: single,
                            }));
                          }}
                          disabled={isRunning}
                          className="px-2.5 py-1 rounded text-xs bg-[#1b1b1f] hover:bg-[#25252b] border border-[#2a2a30] text-muted hover:text-foreground transition-colors disabled:opacity-40 cursor-pointer"
                        >
                          Test
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison Modal Dialog */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141417] border border-[#2a2a30] rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#2a2a30] flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#6366f1]" />
                  {selectedResult.fileName}
                </h3>
                <div className="text-xs text-muted flex items-center gap-3 mt-1">
                  <span>
                    Status:{" "}
                    <strong
                      className={
                        selectedResult.status === "passed"
                          ? "text-emerald-400"
                          : selectedResult.status === "failed"
                          ? "text-rose-400"
                          : "text-amber-400"
                      }
                    >
                      {selectedResult.status.toUpperCase()}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Drift outside line:{" "}
                    <strong className="font-mono text-foreground">{selectedResult.percentChanged}%</strong>
                  </span>
                  {selectedResult.durationMs && (
                    <>
                      <span>•</span>
                      <span>Duration: {selectedResult.durationMs}ms</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-[#1b1b1f] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Images Comparison */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#0a0a0c]">
              {/* Original */}
              <div className="flex flex-col">
                <div className="text-xs font-mono uppercase text-muted mb-2 flex items-center justify-between">
                  <span>1. Original Page</span>
                </div>
                <div className="border border-[#2a2a30] rounded-lg p-2 bg-[#141417] flex items-center justify-center min-h-[350px]">
                  {selectedResult.originalImage ? (
                    <img
                      src={selectedResult.originalImage}
                      alt="Original"
                      className="max-h-[500px] w-auto object-contain bg-white rounded shadow"
                    />
                  ) : (
                    <div className="text-xs text-muted">No image generated</div>
                  )}
                </div>
              </div>

              {/* Edited */}
              <div className="flex flex-col">
                <div className="text-xs font-mono uppercase text-muted mb-2 flex items-center justify-between">
                  <span>2. Edited Page (&quot;...TEST&quot;)</span>
                </div>
                <div className="border border-[#2a2a30] rounded-lg p-2 bg-[#141417] flex items-center justify-center min-h-[350px]">
                  {selectedResult.editedImage ? (
                    <img
                      src={selectedResult.editedImage}
                      alt="Edited"
                      className="max-h-[500px] w-auto object-contain bg-white rounded shadow"
                    />
                  ) : (
                    <div className="text-xs text-muted">No image generated</div>
                  )}
                </div>
              </div>

              {/* Pixel Diff Visualization */}
              <div className="flex flex-col">
                <div className="text-xs font-mono uppercase text-muted mb-2 flex items-center justify-between">
                  <span>3. Pixel Diff & Mask</span>
                  <span className="text-[10px] text-zinc-400">Red: changed | Blue: ignored</span>
                </div>
                <div className="border border-[#2a2a30] rounded-lg p-2 bg-[#141417] flex items-center justify-center min-h-[350px]">
                  {selectedResult.diffImage ? (
                    <img
                      src={selectedResult.diffImage}
                      alt="Diff map"
                      className="max-h-[500px] w-auto object-contain bg-black rounded shadow"
                    />
                  ) : (
                    <div className="text-xs text-muted">No diff available</div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#2a2a30] bg-[#141417] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="text-muted">
                {selectedResult.originalText && (
                  <div>
                    <span className="font-semibold text-zinc-300">Edited line text:</span>{" "}
                    <span className="line-through text-zinc-400">{selectedResult.originalText}</span> →{" "}
                    <span className="text-emerald-400 font-medium">{selectedResult.editedText}</span>
                  </div>
                )}
                {selectedResult.errorMessage && (
                  <div className="text-rose-400 font-mono mt-0.5">{selectedResult.errorMessage}</div>
                )}
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="px-4 py-2 rounded-lg bg-[#2a2a30] hover:bg-[#3a3a42] text-foreground text-xs font-medium transition-colors cursor-pointer self-end"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
