# Build log
## Day 1 — October 18, 2026

- **Project setup:** Imported the Folio PDF editor project into Google AI Studio.
- **GitHub setup:** Connected the project to the GitHub repository `Simo09Rondo/pdf-editor-site` on the `main` branch.
- **Local setup:** Opened the project in VS Code on my computer.
- **Development server:** Ran the project locally and opened the website in a browser.
- **Initial testing:** Began testing the PDF editor with sample PDF files.
- **Synchronization:** Investigated GitHub synchronization between Google AI Studio and VS Code.
- **Notes:** Prepared the project and development environment for further testing.

## Day 2 — October 19, 2026

- **Test files:** Added test PDFs to `public/test-pdfs` and font files to `public/fonts`.
- **Development server:** Ran `npm run dev` and opened the website locally.
- **PDF editing test:** Edited a test PDF and discovered that some text overlaps other text.
- **Deletion bug:** Some text boxes cannot be deleted properly and still appear in the exported PDF.
- **Production build:** Ran `npm run build` successfully in 11.65 seconds.
- **Build output:** Vite generated the `dist/` folder. The project does not use an `out/` folder for this build.
- **GitHub synchronization:** Pushed the PDF and font files to GitHub and confirmed that both folders appear in Google AI Studio.
- **Next steps:** Continue testing the editor, investigate text positioning and deletion/export problems, and record the results.

## Day 3 — Day 3: starting Accuracy Lab
- **It all worked well.

# Day 4 — PDF Accuracy Baseline

**Date:** October 21, 2026  
**Environment:** Local VS Code development server, with IDM browser integration disabled  
**Total PDFs:** 10  
**Passed:** 5 (50%)  
**Failed:** 4 (40%)  
**Scanned:** 1 (10%)  
**Outside-change threshold:** 0.5%

| File | Edit worked? | Outside change % | Visual rating (1–3) | Notes |
|---|---|---:|---|---|
| 01-arial-letter.pdf | Yes | 0.484% | Pending | Passed, but very close to the 0.5% threshold. Inspect spacing and surrounding text carefully. |
| 02-times-report.pdf | Yes | 0.346% | Pending | Passed. Visually inspect font matching and layout preservation. |
| 03-calibri-resume.pdf | Yes, but failed threshold | 2.761% | Pending | High drift. Investigate font substitution, text positioning, and changes outside the edited region. |
| 04-courier-code.pdf | Yes, but failed threshold | 7.487% | Pending | Highest drift. Investigate monospaced font preservation, character spacing, and alignment. |
| 05-invoicetable.pdf | Yes | 0% | Pending | Passed with no measured pixel drift. Inspect the invoice text and table appearance. |
| 06-twocolumns.pdf | Yes | 0.049% | Pending | Passed with low drift. Inspect both columns for alignment or wrapping changes. |
| 07-canva-flyer.pdf | Yes | 0% | Pending | Passed with no measured pixel drift. Inspect the edited heading and overall design. |
| 08-scannedpage.pdf | Not tested for text editing | N/A | Pending | Correctly classified as scanned/image-only; no text objects found on page 1. |
| 09-frenchaccents.pdf | Yes, but failed threshold | 2.411% | Pending | Investigate font encoding, accented characters, font substitution, and layout changes. |
| 10-arabic-page.pdf | Yes, but failed threshold | 0.640% | Pending | Slightly above threshold. Inspect Arabic shaping, character direction, spacing, and surrounding text. |

## Failure classification

- **Wrong font / font metrics:** Investigate files 03 and 04 first.
- **Layout or spacing changes:** Investigate files 03, 04, and 09.
- **Arabic shaping or rendering:** Inspect file 10.
- **Scanned PDF limitation:** File 08 is image-only and requires OCR before text editing can be supported.
- **Near-threshold result:** File 01 passed at 0.484%, leaving little margin below the threshold.

## Baseline conclusion

The editor passed 5 of 9 text-based PDFs, failed 4 of 9 text-based PDFs, and identified 1 image-only scanned PDF. The current 0.5% drift threshold remains unchanged.

Visual ratings remain pending until the original and edited page images are compared directly.

**Screenshot:** Save the Accuracy Lab summary as `baseline-day4.png` in the project folder.


- Visual comparison shows that the amount of visible change varies between PDFs.
- Some edits appear acceptable, while others introduce noticeable differences in font appearance, spacing, or layout.
- The Calibri resume, Courier code document, and French-accent document require further investigation because their measured drift exceeds the current 0.5% threshold.
- The Arabic document also exceeds the threshold and needs a closer visual inspection.
- The scanned-page test is classified as scanned because no text objects were found. The current editor does not provide a complete OCR-based text-editing workflow for this file.
- Keep the 0.5% threshold unchanged for now. Record visual ratings and investigate the causes before adjusting the comparison algorithm.
- Future improvement: evaluate OCR support for scanned PDFs, including text recognition, position detection, and visually consistent replacement.
- Note: `robots.txt` does not exist in the project yet; disallow rules for `/test` and `/test-pdfs` must be added in Phase 6.

## Day 5: fonts


