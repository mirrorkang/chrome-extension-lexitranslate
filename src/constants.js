const QUICK_TRANSLATOR_DEFAULT_SETTINGS = {
  targetLanguage: "zh-CN",
  translationEngine: "mymemory",
  theme: "light",
  fontSize: "large",
  shortcut: {
    ctrlKey: true,
    shiftKey: true,
    metaKey: false,
    altKey: false,
    key: "T"
  }
};

const QUICK_TRANSLATOR_LANGUAGES = [
  { code: "en", label: "英语" },
  { code: "zh-CN", label: "中文" },
  { code: "ja", label: "日语" },
  { code: "ko", label: "韩语" },
  { code: "fr", label: "法语" },
  { code: "es", label: "西班牙语" }
];

const QUICK_TRANSLATOR_ENGINES = [
  { code: "mymemory", label: "MyMemory（免费）" },
  { code: "libretranslate", label: "LibreTranslate（免费）" }
];

const QUICK_TRANSLATOR_MAX_TEXT_LENGTH = 500;

const QUICK_TRANSLATOR_FONT_SIZES = ["small", "medium", "large", "xlarge", "xxlarge"];
