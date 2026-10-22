/**
 * Language profile registry for multi-language PDF typography and OCR alignment.
 * Profiles 9 key languages: pl, cs, tr, ru, uk, bg, sr, el, vi.
 *
 * Each profile defines:
 * - Language code (ISO 639-1)
 * - Native language name
 * - Script (Latin, Cyrillic, Greek)
 * - Tesseract OCR language code
 * - Comprehensive required character set (uppercase, lowercase, precomposed diacritics, and language-specific letters)
 * - Allowed font families based on measured TrueType glyph coverage audits
 */

export type LanguageCode =
  | "pl"
  | "cs"
  | "tr"
  | "ru"
  | "uk"
  | "bg"
  | "sr"
  | "el"
  | "vi";

export type ScriptFamily = "Latin" | "Cyrillic" | "Greek";

export interface LanguageProfile {
  code: LanguageCode;
  nativeName: string;
  script: ScriptFamily;
  tesseractCode: string;
  /** Special/distinctive letters unique to or characteristic of this language. */
  specialCharacters: string[];
  /** Comprehensive set of all uppercase and lowercase letters required for correct rendering. */
  requiredCharacters: string[];
  /** Font family IDs from FONT_REGISTRY verified to provide 100% glyph coverage. */
  allowedFontFamilies: string[];
}

// ---------------------------------------------------------------------------
// Character Sets
// ---------------------------------------------------------------------------

// 1. Polish (pl)
const PL_SPECIAL_LOWER = ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ź", "ż"];
const PL_SPECIAL_UPPER = ["Ą", "Ć", "Ę", "Ł", "Ń", "Ó", "Ś", "Ź", "Ż"];
const PL_BASE_LOWER = "abcdefghijklmnoprstuwxyz".split("");
const PL_BASE_UPPER = "ABCDEFGHIJKLMNOPRSTUWXYZ".split("");
const PL_REQUIRED = [
  ...new Set([
    ...PL_BASE_LOWER,
    ...PL_BASE_UPPER,
    ...PL_SPECIAL_LOWER,
    ...PL_SPECIAL_UPPER,
  ]),
];

// 2. Czech (cs)
const CS_SPECIAL_LOWER = [
  "á", "č", "ď", "é", "ě", "í", "ň", "ó", "ř", "š", "ť", "ú", "ů", "ý", "ž",
];
const CS_SPECIAL_UPPER = [
  "Á", "Č", "Ď", "É", "Ě", "Í", "Ň", "Ó", "Ř", "Š", "Ť", "Ú", "Ů", "Ý", "Ž",
];
const CS_BASE_LOWER = "abcdefghijklmnopqrstuvwxyz".split("");
const CS_BASE_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const CS_REQUIRED = [
  ...new Set([
    ...CS_BASE_LOWER,
    ...CS_BASE_UPPER,
    ...CS_SPECIAL_LOWER,
    ...CS_SPECIAL_UPPER,
  ]),
];

// 3. Turkish (tr)
// Critical: dotless ı (U+0131), dotted i (U+0069), dotless I (U+0049), dotted İ (U+0130)
const TR_SPECIAL_LOWER = ["ç", "ğ", "ı", "i", "ö", "ş", "ü"];
const TR_SPECIAL_UPPER = ["Ç", "Ğ", "I", "İ", "Ö", "Ş", "Ü"];
const TR_BASE_LOWER = "abcdefghjklmnoprstuvyz".split("");
const TR_BASE_UPPER = "ABCDEFGHJKLMNOPRSTUVYZ".split("");
const TR_REQUIRED = [
  ...new Set([
    ...TR_BASE_LOWER,
    ...TR_BASE_UPPER,
    ...TR_SPECIAL_LOWER,
    ...TR_SPECIAL_UPPER,
  ]),
];

// 4. Russian (ru)
const RU_LETTERS_LOWER = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя".split("");
const RU_LETTERS_UPPER = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split("");
const RU_SPECIAL = ["ё", "ъ", "ы", "э", "Ё", "Ъ", "Ы", "Э"];
const RU_REQUIRED = [...RU_LETTERS_LOWER, ...RU_LETTERS_UPPER];

// 5. Ukrainian (uk)
// Special letters: ґ, є, і, ї and uppercase Ґ, Є, І, Ї
const UK_SPECIAL_LOWER = ["ґ", "є", "і", "ї"];
const UK_SPECIAL_UPPER = ["Ґ", "Є", "І", "Ї"];
const UK_LETTERS_LOWER = "абвгґдеєжзиіїйклмнопрстуфхцчшщьюя".split("");
const UK_LETTERS_UPPER = "АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ".split("");
const UK_REQUIRED = [...UK_LETTERS_LOWER, ...UK_LETTERS_UPPER];

// 6. Bulgarian (bg)
// 30 Cyrillic letters without Russian э, ы, ё
const BG_LETTERS_LOWER = "абвгдежзийклмнопрстуфхцчшщъьюя".split("");
const BG_LETTERS_UPPER = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЮЯ".split("");
const BG_SPECIAL = ["ъ", "щ", "ь", "Ъ", "Щ", "Ь"];
const BG_REQUIRED = [...BG_LETTERS_LOWER, ...BG_LETTERS_UPPER];

// 7. Serbian Cyrillic (sr)
// Special letters: ђ, ј, љ, њ, ћ, џ and uppercase Ђ, Ј, Љ, Њ, Ћ, Џ
const SR_SPECIAL_LOWER = ["ђ", "ј", "љ", "њ", "ћ", "џ"];
const SR_SPECIAL_UPPER = ["Ђ", "Ј", "Љ", "Њ", "Ћ", "Џ"];
const SR_LETTERS_LOWER = "абвгдђежзијклљмнњопрстћуфхцчџш".split("");
const SR_LETTERS_UPPER = "АБВГДЂЕЖЗИЈКЛЉМНЊОПРСТЋУФХЦЧЏШ".split("");
const SR_REQUIRED = [...SR_LETTERS_LOWER, ...SR_LETTERS_UPPER];

// 8. Greek (el)
// Letters α..ω, final ς, accented ά..ώ, diaereses ϊ, ϋ, ΐ, ΰ and uppercase
const EL_LETTERS_LOWER = "αβγδεζηθικλμνξοπρστυφχψως".split("");
const EL_LETTERS_UPPER = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ".split("");
const EL_ACCENTED_LOWER = ["ά", "έ", "ή", "ί", "ό", "ύ", "ώ", "ϊ", "ϋ", "ΐ", "ΰ"];
const EL_ACCENTED_UPPER = ["Ά", "Έ", "Ή", "Ί", "Ό", "Ύ", "Ώ", "Ϊ", "Ϋ"];
const EL_SPECIAL = ["ς", ...EL_ACCENTED_LOWER, ...EL_ACCENTED_UPPER];
const EL_REQUIRED = [
  ...EL_LETTERS_LOWER,
  ...EL_LETTERS_UPPER,
  ...EL_ACCENTED_LOWER,
  ...EL_ACCENTED_UPPER,
];

// 9. Vietnamese (vi)
// Comprehensive set: Latin letters + horn/breve (ă, â, đ, ê, ô, ơ, ư) + all 5 tone combinations
const VI_BASE_LOWER = "abcdefghijklmnopqrstuvxy".split("");
const VI_BASE_UPPER = "ABCDEFGHIJKLMNOPQRSTUVXY".split("");
const VI_SPECIAL_LETTERS_LOWER = ["ă", "â", "đ", "ê", "ô", "ơ", "ư"];
const VI_SPECIAL_LETTERS_UPPER = ["Ă", "Â", "Đ", "Ê", "Ô", "Ơ", "Ư"];

// All precomposed tone-marked vowels:
const VI_TONED_VOWELS_LOWER = [
  // a
  "à", "á", "ả", "ã", "ạ",
  // ă
  "ằ", "ắ", "ẳ", "ẵ", "ặ",
  // â
  "ầ", "ấ", "ẩ", "ẫ", "ậ",
  // e
  "è", "é", "ẻ", "ẽ", "ẹ",
  // ê
  "ề", "ế", "ể", "ễ", "ệ",
  // i
  "ì", "í", "ỉ", "ĩ", "ị",
  // o
  "ò", "ó", "ỏ", "õ", "ọ",
  // ô
  "ồ", "ố", "ổ", "ỗ", "ộ",
  // ơ
  "ờ", "ớ", "ở", "ỡ", "ợ",
  // u
  "ù", "ú", "ủ", "ũ", "ụ",
  // ư
  "ừ", "ứ", "ử", "ữ", "ự",
  // y
  "ỳ", "ý", "ỷ", "ỹ", "ỵ",
];

const VI_TONED_VOWELS_UPPER = [
  // A
  "À", "Á", "Ả", "Ã", "Ạ",
  // Ă
  "Ằ", "Ắ", "Ẳ", "Ẵ", "Ặ",
  // Â
  "Ầ", "Ấ", "Ẩ", "Ẫ", "Ậ",
  // E
  "È", "É", "Ẻ", "Ẽ", "Ẹ",
  // Ê
  "Ề", "Ế", "Ể", "Ễ", "Ệ",
  // I
  "Ì", "Í", "Ỉ", "Ĩ", "Ị",
  // O
  "Ò", "Ó", "Ỏ", "Õ", "Ọ",
  // Ô
  "Ồ", "Ố", "Ổ", "Ỗ", "Ộ",
  // Ơ
  "Ờ", "Ớ", "Ở", "Ỡ", "Ợ",
  // U
  "Ù", "Ú", "Ủ", "Ũ", "Ụ",
  // Ư
  "Ừ", "Ứ", "Ử", "Ữ", "Ự",
  // Y
  "Ỳ", "Ý", "Ỷ", "Ỹ", "Ỵ",
];

const VI_REQUIRED = [
  ...new Set([
    ...VI_BASE_LOWER,
    ...VI_BASE_UPPER,
    ...VI_SPECIAL_LETTERS_LOWER,
    ...VI_SPECIAL_LETTERS_UPPER,
    ...VI_TONED_VOWELS_LOWER,
    ...VI_TONED_VOWELS_UPPER,
  ]),
];

// ---------------------------------------------------------------------------
// Font Family Support Sets (based on audited glyph coverage)
// Caladea is excluded from ru, uk, bg, sr, el, vi because it lacks Cyrillic,
// Greek, and Vietnamese tone marks.
// ---------------------------------------------------------------------------
const ALL_FIVE_FAMILIES = ["arimo", "tinos", "cousine", "carlito", "caladea"];
const FOUR_EXTENDED_FAMILIES = ["arimo", "tinos", "cousine", "carlito"]; // Excludes caladea

export const LANGUAGE_REGISTRY: Record<LanguageCode, LanguageProfile> = {
  pl: {
    code: "pl",
    nativeName: "Polski",
    script: "Latin",
    tesseractCode: "pol",
    specialCharacters: [...PL_SPECIAL_LOWER, ...PL_SPECIAL_UPPER],
    requiredCharacters: PL_REQUIRED,
    allowedFontFamilies: ALL_FIVE_FAMILIES,
  },
  cs: {
    code: "cs",
    nativeName: "Čeština",
    script: "Latin",
    tesseractCode: "ces",
    specialCharacters: [...CS_SPECIAL_LOWER, ...CS_SPECIAL_UPPER],
    requiredCharacters: CS_REQUIRED,
    allowedFontFamilies: ALL_FIVE_FAMILIES,
  },
  tr: {
    code: "tr",
    nativeName: "Türkçe",
    script: "Latin",
    tesseractCode: "tur",
    specialCharacters: [...TR_SPECIAL_LOWER, ...TR_SPECIAL_UPPER],
    requiredCharacters: TR_REQUIRED,
    allowedFontFamilies: ALL_FIVE_FAMILIES,
  },
  ru: {
    code: "ru",
    nativeName: "Русский",
    script: "Cyrillic",
    tesseractCode: "rus",
    specialCharacters: RU_SPECIAL,
    requiredCharacters: RU_REQUIRED,
    allowedFontFamilies: FOUR_EXTENDED_FAMILIES,
  },
  uk: {
    code: "uk",
    nativeName: "Українська",
    script: "Cyrillic",
    tesseractCode: "ukr",
    specialCharacters: [...UK_SPECIAL_LOWER, ...UK_SPECIAL_UPPER],
    requiredCharacters: UK_REQUIRED,
    allowedFontFamilies: FOUR_EXTENDED_FAMILIES,
  },
  bg: {
    code: "bg",
    nativeName: "Български",
    script: "Cyrillic",
    tesseractCode: "bul",
    specialCharacters: BG_SPECIAL,
    requiredCharacters: BG_REQUIRED,
    allowedFontFamilies: FOUR_EXTENDED_FAMILIES,
  },
  sr: {
    code: "sr",
    nativeName: "Српски",
    script: "Cyrillic",
    tesseractCode: "srp",
    specialCharacters: [...SR_SPECIAL_LOWER, ...SR_SPECIAL_UPPER],
    requiredCharacters: SR_REQUIRED,
    allowedFontFamilies: FOUR_EXTENDED_FAMILIES,
  },
  el: {
    code: "el",
    nativeName: "Ελληνικά",
    script: "Greek",
    tesseractCode: "ell",
    specialCharacters: EL_SPECIAL,
    requiredCharacters: EL_REQUIRED,
    allowedFontFamilies: FOUR_EXTENDED_FAMILIES,
  },
  vi: {
    code: "vi",
    nativeName: "Tiếng Việt",
    script: "Latin",
    tesseractCode: "vie",
    specialCharacters: [
      ...VI_SPECIAL_LETTERS_LOWER,
      ...VI_SPECIAL_LETTERS_UPPER,
      "đ",
      "Đ",
    ],
    requiredCharacters: VI_REQUIRED,
    allowedFontFamilies: FOUR_EXTENDED_FAMILIES,
  },
};

/**
 * Look up a language profile by its 2-letter code.
 */
export function getLanguageProfile(code: string): LanguageProfile | undefined {
  return LANGUAGE_REGISTRY[code as LanguageCode];
}

/**
 * Return all registered language codes.
 */
export function getAllLanguageCodes(): LanguageCode[] {
  return Object.keys(LANGUAGE_REGISTRY) as LanguageCode[];
}
