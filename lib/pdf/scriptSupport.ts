/**
 * Script Support & Unsupported Script Detection (Prompt 3M).
 *
 * Folio currently supports editing Latin and related Western alphabetic text.
 * Complex text layouts, bidirectional scripts, and scripts requiring complex contextual shaping
 * or large ideographic repertoires are not yet supported for editing.
 *
 * If a text line contains Arabic, Hebrew, Devanagari, Thai, Chinese, Japanese, or Korean characters,
 * editing that line is blocked and the user is shown:
 * "Editing this script is not supported yet."
 */

export const UNSUPPORTED_SCRIPT_MESSAGE = "Editing this script is not supported yet.";

/**
 * Unicode ranges and script properties for:
 * - Arabic: \u0600-\u06FF, \u0750-\u077F, \u0870-\u08FF, \uFB50-\uFDFF, \uFE70-\uFEFF, or \p{sc=Arabic}
 * - Hebrew: \u0590-\u05FF, \uFB1D-\uFB4F, or \p{sc=Hebrew}
 * - Devanagari: \u0900-\u097F, \uA8E0-\uA8FF, \u1CD0-\u1CFF, or \p{sc=Devanagari}
 * - Thai: \u0E00-\u0E7F, or \p{sc=Thai}
 * - Chinese (Han): \u4E00-\u9FFF, \u3400-\u4DBF, \u2E80-\u2FFF, \uF900-\uFAFF, or \p{sc=Han}
 * - Japanese: Hiragana (\u3040-\u309F, \p{sc=Hiragana}), Katakana (\u30A0-\u30FF, \u31F0-\u31FF, \uFF65-\uFF9F, \p{sc=Katakana}), Kanji (\p{sc=Han})
 * - Korean: Hangul syllables (\uAC00-\uD7AF, \p{sc=Hangul}), Hangul Jamo (\u1100-\u11FF, \u3130-\u318F, \uA960-\uA97F, \uD7B0-\uD7FF)
 */
export const UNSUPPORTED_SCRIPTS_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u0870-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF\uFB1D-\uFB4F\u0900-\u097F\uA8E0-\uA8FF\u1CD0-\u1CFF\u0E00-\u0E7F\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\u1100-\u11FF\u3130-\u318F\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF\u2E80-\u2FFF\u3000-\u303F\u3100-\u312F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF65-\uFF9F]|\p{sc=Arabic}|\p{sc=Hebrew}|\p{sc=Devanagari}|\p{sc=Thai}|\p{sc=Han}|\p{sc=Hiragana}|\p{sc=Katakana}|\p{sc=Hangul}/u;

/**
 * Returns true if the string contains any characters from Arabic, Hebrew, Devanagari,
 * Thai, Chinese, Japanese, or Korean scripts.
 */
export function containsUnsupportedScript(text: string | null | undefined): boolean {
  if (!text) return false;
  return UNSUPPORTED_SCRIPTS_REGEX.test(text);
}
