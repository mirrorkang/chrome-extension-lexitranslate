function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(QUICK_TRANSLATOR_DEFAULT_SETTINGS));
}

function normalizeSettings(raw = {}) {
  const defaults = cloneDefaultSettings();
  const shortcut = raw.shortcut || {};

  return {
    targetLanguage: raw.targetLanguage || defaults.targetLanguage,
    translationEngine: QUICK_TRANSLATOR_ENGINES.some(
      (engine) => engine.code === raw.translationEngine
    )
      ? raw.translationEngine
      : defaults.translationEngine,
    theme: raw.theme === "dark" ? "dark" : "light",
    fontSize: QUICK_TRANSLATOR_FONT_SIZES.includes(raw.fontSize)
      ? raw.fontSize
      : defaults.fontSize,
    shortcut: {
      ctrlKey: Boolean(
        shortcut.ctrlKey !== undefined ? shortcut.ctrlKey : defaults.shortcut.ctrlKey
      ),
      shiftKey: Boolean(
        shortcut.shiftKey !== undefined ? shortcut.shiftKey : defaults.shortcut.shiftKey
      ),
      metaKey: Boolean(
        shortcut.metaKey !== undefined ? shortcut.metaKey : defaults.shortcut.metaKey
      ),
      altKey: Boolean(shortcut.altKey !== undefined ? shortcut.altKey : defaults.shortcut.altKey),
      key: String(shortcut.key || defaults.shortcut.key).toUpperCase()
    }
  };
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["quickTranslatorSettings"], (result) => {
      resolve(normalizeSettings(result.quickTranslatorSettings));
    });
  });
}

async function saveSettings(nextSettings) {
  const normalized = normalizeSettings(nextSettings);
  return new Promise((resolve) => {
    chrome.storage.sync.set({ quickTranslatorSettings: normalized }, () => resolve(normalized));
  });
}
