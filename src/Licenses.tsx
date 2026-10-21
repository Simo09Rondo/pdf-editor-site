import { useState } from "react";
import { ArrowLeft, ExternalLink, ShieldCheck, Type, Code2, Heart } from "lucide-react";
import { FONT_REGISTRY } from "@/lib/pdf/fontRegistry";

export function Licenses() {
  const [activeTab, setActiveTab] = useState<"fonts" | "software">("fonts");

  return (
    <div className="min-h-screen bg-[#06060a] text-foreground p-6 sm:p-10 font-sans">
      <div className="max-w-5xl mx-auto">
        {/* Navigation & Header */}
        <header className="pb-8 border-b border-[#2a2a30]">
          <div className="flex items-center gap-3 mb-4">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors px-3 py-1.5 rounded-lg bg-[#141417] border border-[#2a2a30]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Editor
            </a>
            <span className="text-xs uppercase tracking-widest text-[#2dd4bf] font-mono bg-[#2dd4bf]/10 px-2 py-0.5 rounded border border-[#2dd4bf]/20">
              Open Source Credits
            </span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
            <ShieldCheck className="h-8 w-8 text-[#6366f1]" />
            Licenses &amp; Attribution
          </h1>
          <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
            Folio is built on open-source software and includes high-quality open-source TrueType
            fonts that match the metrics of standard document fonts. Everything runs 100% locally
            inside your browser.
          </p>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6">
            <button
              onClick={() => setActiveTab("fonts")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "fonts"
                  ? "bg-[#1b1b1f] text-foreground border border-[#2a2a30] shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Type className="h-4 w-4" />
              Font Families (5)
            </button>
            <button
              onClick={() => setActiveTab("software")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "software"
                  ? "bg-[#1b1b1f] text-foreground border border-[#2a2a30] shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Code2 className="h-4 w-4" />
              Core Software Credits
            </button>
          </div>
        </header>

        {/* Tab 1: Fonts */}
        {activeTab === "fonts" && (
          <div className="mt-8 space-y-8">
            <section>
              <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground mb-4">
                <span>Embedded TrueType Replacement Fonts</span>
              </h2>
              <p className="text-xs text-muted leading-relaxed mb-6">
                These font families are metric-compatible open-source replacements for proprietary
                fonts. When a PDF references fonts without all required characters embedded, the
                editor can substitute these fonts while preserving letter widths and page layouts.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(FONT_REGISTRY).map((font) => (
                  <div
                    key={font.id}
                    className="p-5 rounded-xl bg-[#141417] border border-[#2a2a30] flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-bold text-foreground">{font.displayName}</h3>
                          <div className="text-xs text-muted mt-0.5">
                            Designer: <span className="text-zinc-300">{font.designer}</span>
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded border font-medium ${
                            font.license === "Apache-2.0"
                              ? "bg-blue-950/40 text-blue-300 border-blue-500/30"
                              : "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {font.license}
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#2a2a30]/60">
                        <div className="text-[11px] uppercase tracking-wider font-mono text-muted">
                          Replaces with matching metrics:
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {font.replaces.slice(0, 4).map((r) => (
                            <span
                              key={r}
                              className="text-xs px-2 py-0.5 rounded bg-[#1b1b1f] border border-[#2a2a30] text-zinc-300"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-[11px] uppercase tracking-wider font-mono text-muted">
                          Styles included:
                        </div>
                        <div className="text-xs text-zinc-400 mt-1 flex flex-wrap gap-2">
                          <span className="font-normal">Regular</span>
                          <span className="text-zinc-600">•</span>
                          <span className="font-bold text-zinc-300">Bold</span>
                          <span className="text-zinc-600">•</span>
                          <span className="italic">Italic</span>
                          <span className="text-zinc-600">•</span>
                          <span className="font-bold italic text-zinc-300">Bold Italic</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* License Text Details */}
            <section className="pt-6 border-t border-[#2a2a30] space-y-6">
              <div className="p-5 rounded-xl bg-[#141417] border border-[#2a2a30]">
                <h3 className="font-bold text-sm text-foreground mb-2 flex items-center justify-between">
                  <span>Apache License, Version 2.0</span>
                  <span className="text-xs text-muted font-normal">Arimo, Tinos, Cousine</span>
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  Licensed under the Apache License, Version 2.0 (the &quot;License&quot;); you may
                  not use this file except in compliance with the License. You may obtain a copy of
                  the License at{" "}
                  <a
                    href="http://www.apache.org/licenses/LICENSE-2.0"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#6366f1] hover:underline inline-flex items-center gap-0.5"
                  >
                    apache.org/licenses/LICENSE-2.0 <ExternalLink className="h-3 w-3 inline" />
                  </a>
                  . Unless required by applicable law or agreed to in writing, software distributed
                  under the License is distributed on an &quot;AS IS&quot; BASIS, WITHOUT WARRANTIES
                  OR CONDITIONS OF ANY KIND, either express or implied.
                </p>
              </div>

              <div className="p-5 rounded-xl bg-[#141417] border border-[#2a2a30]">
                <h3 className="font-bold text-sm text-foreground mb-2 flex items-center justify-between">
                  <span>SIL Open Font License, Version 1.1 (OFL-1.1)</span>
                  <span className="text-xs text-muted font-normal">Carlito, Caladea</span>
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  This Font Software is licensed under the SIL Open Font License, Version 1.1. The
                  goals of the Open Font License (OFL) are to stimulate worldwide development of
                  collaborative font projects, to support font creation efforts of academic and
                  linguistic communities, and to provide a free and open framework in which fonts
                  may be shared and improved in partnership with others. Full license details at{" "}
                  <a
                    href="https://openfontlicense.org"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#6366f1] hover:underline inline-flex items-center gap-0.5"
                  >
                    openfontlicense.org <ExternalLink className="h-3 w-3 inline" />
                  </a>
                  .
                </p>
              </div>
            </section>
          </div>
        )}

        {/* Tab 2: Software */}
        {activeTab === "software" && (
          <div className="mt-8 space-y-6">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                <span>Core Open-Source Projects</span>
              </h2>
              <p className="text-xs text-muted leading-relaxed">
                Folio is built upon exceptional open-source libraries that make fast, secure,
                browser-side PDF editing possible without uploading sensitive documents to a server.
              </p>

              <div className="space-y-4 mt-4">
                {/* Folio */}
                <div className="p-5 rounded-xl bg-[#141417] border border-[#2a2a30]">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                        Folio
                        <span className="text-xs font-normal text-muted">@ zps</span>
                      </h3>
                      <p className="text-xs text-muted mt-1 leading-relaxed">
                        A private, modern, browser-first PDF editor designed for in-place text
                        editing, annotation drawing, and page management.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1b1b1f] border border-[#2a2a30] text-zinc-300">
                      MIT License
                    </span>
                  </div>
                </div>

                {/* PDFium */}
                <div className="p-5 rounded-xl bg-[#141417] border border-[#2a2a30]">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                        PDFium
                        <span className="text-xs font-normal text-muted">Google &amp; PDFium Authors</span>
                      </h3>
                      <p className="text-xs text-muted mt-1 leading-relaxed">
                        Google&apos;s open-source C++ PDF rendering engine, compiled to WebAssembly
                        via EmbedPDF for pixel-crisp canvas rendering, font embedding, and
                        content stream generation directly in the browser.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-950/40 text-blue-300 border border-blue-500/30">
                      BSD 3-Clause / Apache 2.0
                    </span>
                  </div>
                </div>

                {/* pdf-lib */}
                <div className="p-5 rounded-xl bg-[#141417] border border-[#2a2a30]">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                        pdf-lib
                        <span className="text-xs font-normal text-muted">Andrew Dillon (Hopding)</span>
                      </h3>
                      <p className="text-xs text-muted mt-1 leading-relaxed">
                        Pure JavaScript PDF library used for structural document assembly,
                        in-memory page composition, vector drawing, and annotation serialization.
                      </p>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1b1b1f] border border-[#2a2a30] text-zinc-300">
                      MIT License
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Footer Note */}
        <footer className="mt-12 pt-6 border-t border-[#2a2a30] flex flex-col sm:flex-row items-center justify-between text-xs text-muted gap-3">
          <div className="flex items-center gap-1.5">
            <span>Built with</span>
            <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
            <span>for open-source document tools.</span>
          </div>
          <a
            href="/"
            className="text-foreground/70 hover:text-foreground transition-colors font-medium"
          >
            ← Return to Editor
          </a>
        </footer>
      </div>
    </div>
  );
}
