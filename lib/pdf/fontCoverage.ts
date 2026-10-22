/**
 * Dependency-free TrueType / OpenType SFNT font character coverage parser.
 * Reads the 'cmap' table supporting Unicode Format 4 (BMP) and Format 12 (full Unicode).
 * Strictly validates table offsets, lengths, and bounds.
 */

export class MalformedFontError extends Error {
  constructor(message: string) {
    super(`Malformed font data: ${message}`);
    this.name = "MalformedFontError";
  }
}

/**
 * Big-endian binary reader helper operating on Uint8Array.
 */
class BinaryReader {
  private view: DataView;
  readonly length: number;

  constructor(private buffer: Uint8Array) {
    this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    this.length = buffer.byteLength;
  }

  u8(offset: number): number {
    if (offset < 0 || offset + 1 > this.length) {
      throw new MalformedFontError(`Out of bounds read at offset ${offset}`);
    }
    return this.view.getUint8(offset);
  }

  u16(offset: number): number {
    if (offset < 0 || offset + 2 > this.length) {
      throw new MalformedFontError(`Out of bounds 16-bit read at offset ${offset}`);
    }
    return this.view.getUint16(offset, false);
  }

  i16(offset: number): number {
    if (offset < 0 || offset + 2 > this.length) {
      throw new MalformedFontError(`Out of bounds signed 16-bit read at offset ${offset}`);
    }
    return this.view.getInt16(offset, false);
  }

  u32(offset: number): number {
    if (offset < 0 || offset + 4 > this.length) {
      throw new MalformedFontError(`Out of bounds 32-bit read at offset ${offset}`);
    }
    return this.view.getUint32(offset, false);
  }

  tag(offset: number): string {
    if (offset < 0 || offset + 4 > this.length) {
      throw new MalformedFontError(`Out of bounds tag read at offset ${offset}`);
    }
    let s = "";
    for (let i = 0; i < 4; i++) {
      s += String.fromCharCode(this.view.getUint8(offset + i));
    }
    return s;
  }
}

/**
 * Parse the 'cmap' table of an SFNT (TrueType/OpenType) font and extract
 * the Set of Unicode codepoints mapped to non-zero glyph indices.
 *
 * Supports Unicode Format 4 (BMP) and Format 12 (Full 32-bit Unicode).
 * Throws MalformedFontError if the font data is invalid, truncated, or lacks a valid cmap.
 */
export function readFontGlyphCoverage(fontData: Uint8Array): Set<number> {
  if (!fontData || fontData.byteLength < 12) {
    throw new MalformedFontError("Header is too short (< 12 bytes)");
  }

  const r = new BinaryReader(fontData);

  // Validate SFNT version
  const sfntVersion = r.u32(0);
  // 0x00010000 (TrueType), 0x4F54544F ('OTTO' OpenType/CFF), 0x74727565 ('true')
  if (
    sfntVersion !== 0x00010000 &&
    sfntVersion !== 0x4f54544f &&
    sfntVersion !== 0x74727565
  ) {
    throw new MalformedFontError(`Invalid SFNT version: 0x${sfntVersion.toString(16)}`);
  }

  const numTables = r.u16(4);
  if (12 + numTables * 16 > r.length) {
    throw new MalformedFontError("Table directory exceeds font buffer length");
  }

  // Find 'cmap' table record
  let cmapOffset = 0;
  let cmapLength = 0;
  for (let i = 0; i < numTables; i++) {
    const entryOffset = 12 + i * 16;
    const tag = r.tag(entryOffset);
    if (tag === "cmap") {
      cmapOffset = r.u32(entryOffset + 8);
      cmapLength = r.u32(entryOffset + 12);
      break;
    }
  }

  if (cmapOffset === 0 || cmapLength === 0) {
    throw new MalformedFontError("No 'cmap' table found in font directory");
  }

  if (cmapOffset + cmapLength > r.length) {
    throw new MalformedFontError("cmap table boundary exceeds font file size");
  }

  if (cmapLength < 4) {
    throw new MalformedFontError("cmap table is truncated (< 4 bytes)");
  }

  // Header of cmap table: version (uint16), numSubtables (uint16)
  const cmapVersion = r.u16(cmapOffset);
  if (cmapVersion !== 0) {
    throw new MalformedFontError(`Unsupported cmap table version: ${cmapVersion}`);
  }

  const numSubtables = r.u16(cmapOffset + 2);
  if (4 + numSubtables * 8 > cmapLength) {
    throw new MalformedFontError("cmap subtable headers exceed cmap table length");
  }

  const codepoints = new Set<number>();
  let foundUnicodeSubtable = false;

  for (let i = 0; i < numSubtables; i++) {
    const subHeader = cmapOffset + 4 + i * 8;
    const platformId = r.u16(subHeader);
    const encodingId = r.u16(subHeader + 2);
    const subtableRelativeOffset = r.u32(subHeader + 4);

    if (subtableRelativeOffset + 6 > cmapLength) {
      throw new MalformedFontError(`Subtable ${i} offset out of cmap table range`);
    }

    const subtableOffset = cmapOffset + subtableRelativeOffset;
    const format = r.u16(subtableOffset);

    // Is this a Unicode-compatible subtable?
    // Platform 0 (Unicode) or Platform 3 (Windows Unicode: BMP=1, Full=10)
    const isUnicodePlatform =
      platformId === 0 ||
      (platformId === 3 && (encodingId === 1 || encodingId === 10));

    if (!isUnicodePlatform) {
      continue;
    }

    if (format === 4) {
      foundUnicodeSubtable = true;
      parseCmapFormat4(r, subtableOffset, cmapOffset + cmapLength, codepoints);
    } else if (format === 12) {
      foundUnicodeSubtable = true;
      parseCmapFormat12(r, subtableOffset, cmapOffset + cmapLength, codepoints);
    }
  }

  if (!foundUnicodeSubtable) {
    throw new MalformedFontError(
      "No supported Unicode subtable found (Format 4 or Format 12 required)",
    );
  }

  return codepoints;
}

/**
 * Parse Format 4: Segment mapping to delta values (16-bit BMP)
 */
function parseCmapFormat4(
  r: BinaryReader,
  subOffset: number,
  maxOffset: number,
  codepoints: Set<number>,
): void {
  if (subOffset + 14 > maxOffset) {
    throw new MalformedFontError("Format 4 subtable header truncated");
  }

  const length = r.u16(subOffset + 2);
  if (subOffset + length > maxOffset) {
    throw new MalformedFontError("Format 4 subtable length extends beyond cmap bounds");
  }

  const segCountX2 = r.u16(subOffset + 6);
  if (segCountX2 % 2 !== 0 || segCountX2 < 2) {
    throw new MalformedFontError(`Invalid segCountX2 in Format 4 subtable: ${segCountX2}`);
  }

  const segCount = segCountX2 / 2;
  const endCodeOffset = subOffset + 14;
  const reservedPadOffset = endCodeOffset + segCountX2;
  const startCodeOffset = reservedPadOffset + 2;
  const idDeltaOffset = startCodeOffset + segCountX2;
  const idRangeOffset = idDeltaOffset + segCountX2;

  if (idRangeOffset + segCountX2 > subOffset + length) {
    throw new MalformedFontError("Format 4 subtable segments exceed subtable length");
  }

  for (let s = 0; s < segCount; s++) {
    const endCode = r.u16(endCodeOffset + s * 2);
    const startCode = r.u16(startCodeOffset + s * 2);
    const idDelta = r.i16(idDeltaOffset + s * 2);
    const idRangeOffsetVal = r.u16(idRangeOffset + s * 2);

    if (startCode === 0xffff) {
      break;
    }

    if (startCode > endCode) {
      throw new MalformedFontError(
        `Format 4 segment startCode (${startCode}) > endCode (${endCode})`,
      );
    }

    for (let c = startCode; c <= endCode; c++) {
      let glyphId = 0;
      if (idRangeOffsetVal === 0) {
        glyphId = (c + idDelta) & 0xffff;
      } else {
        const glyphAddress = idRangeOffset + s * 2 + idRangeOffsetVal + (c - startCode) * 2;
        if (glyphAddress + 2 > subOffset + length) {
          throw new MalformedFontError("Format 4 glyph address out of subtable bounds");
        }
        const rawGlyph = r.u16(glyphAddress);
        if (rawGlyph !== 0) {
          glyphId = (rawGlyph + idDelta) & 0xffff;
        }
      }

      if (glyphId !== 0) {
        codepoints.add(c);
      }
    }
  }
}

/**
 * Parse Format 12: Segmented coverage (32-bit Unicode)
 */
function parseCmapFormat12(
  r: BinaryReader,
  subOffset: number,
  maxOffset: number,
  codepoints: Set<number>,
): void {
  if (subOffset + 16 > maxOffset) {
    throw new MalformedFontError("Format 12 subtable header truncated");
  }

  const length = r.u32(subOffset + 4);
  if (subOffset + length > maxOffset) {
    throw new MalformedFontError("Format 12 subtable length extends beyond cmap bounds");
  }

  const numGroups = r.u32(subOffset + 12);
  if (subOffset + 16 + numGroups * 12 > subOffset + length) {
    throw new MalformedFontError("Format 12 groups exceed subtable length");
  }

  for (let g = 0; g < numGroups; g++) {
    const groupOffset = subOffset + 16 + g * 12;
    const startCharCode = r.u32(groupOffset);
    const endCharCode = r.u32(groupOffset + 4);
    const startGlyphId = r.u32(groupOffset + 8);

    if (startCharCode > endCharCode) {
      throw new MalformedFontError(
        `Format 12 group startCharCode (${startCharCode}) > endCharCode (${endCharCode})`,
      );
    }

    for (let c = startCharCode; c <= endCharCode; c++) {
      const glyphId = startGlyphId + (c - startCharCode);
      if (glyphId !== 0) {
        codepoints.add(c);
      }
    }
  }
}

/**
 * Result of checking a font's glyph coverage against a required character set.
 */
export interface CoverageCheckResult {
  ok: boolean;
  totalRequired: number;
  coveredCount: number;
  missing: string[];
}

/**
 * Check whether a set of glyph codepoints covers all characters in a required list.
 */
export function checkCharacterCoverage(
  glyphs: Set<number>,
  requiredCharacters: string[],
): CoverageCheckResult {
  const missing: string[] = [];
  const uniqueChars = Array.from(new Set(requiredCharacters));

  for (const ch of uniqueChars) {
    const code = ch.codePointAt(0);
    if (code === undefined || !glyphs.has(code)) {
      missing.push(ch);
    }
  }

  return {
    ok: missing.length === 0,
    totalRequired: uniqueChars.length,
    coveredCount: uniqueChars.length - missing.length,
    missing,
  };
}
