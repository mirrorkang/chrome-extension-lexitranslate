function renderLanguageOptions(selectEl, selected) {
  selectEl.innerHTML = "";
  QUICK_TRANSLATOR_LANGUAGES.forEach((language) => {
    const option = document.createElement("option");
    option.value = language.code;
    option.textContent = language.label;
    option.selected = language.code === selected;
    selectEl.appendChild(option);
  });
}

function renderEngineOptions(selectEl, selected) {
  selectEl.innerHTML = "";
  QUICK_TRANSLATOR_ENGINES.forEach((engine) => {
    const option = document.createElement("option");
    option.value = engine.code;
    option.textContent = engine.label;
    option.selected = engine.code === selected;
    selectEl.appendChild(option);
  });
}

async function initOptionsPage() {
  const translationEngineEl = document.getElementById("translationEngine");
  const targetLanguageEl = document.getElementById("targetLanguage");
  const themeEl = document.getElementById("theme");
  const ctrlKeyEl = document.getElementById("ctrlKey");
  const shiftKeyEl = document.getElementById("shiftKey");
  const altKeyEl = document.getElementById("altKey");
  const metaKeyEl = document.getElementById("metaKey");
  const shortcutKeyEl = document.getElementById("shortcutKey");
  const saveBtn = document.getElementById("saveBtn");
  const statusEl = document.getElementById("status");

  const settings = await getSettings();
  renderEngineOptions(translationEngineEl, settings.translationEngine);
  renderLanguageOptions(targetLanguageEl, settings.targetLanguage);
  themeEl.value = settings.theme;
  ctrlKeyEl.checked = settings.shortcut.ctrlKey;
  shiftKeyEl.checked = settings.shortcut.shiftKey;
  altKeyEl.checked = settings.shortcut.altKey;
  metaKeyEl.checked = settings.shortcut.metaKey;
  shortcutKeyEl.value = settings.shortcut.key;

  saveBtn.addEventListener("click", async () => {
    const next = {
      translationEngine: translationEngineEl.value,
      targetLanguage: targetLanguageEl.value,
      theme: themeEl.value,
      shortcut: {
        ctrlKey: ctrlKeyEl.checked,
        shiftKey: shiftKeyEl.checked,
        altKey: altKeyEl.checked,
        metaKey: metaKeyEl.checked,
        key: (shortcutKeyEl.value || "T").toUpperCase()
      },
      fontSize: settings.fontSize
    };
    await saveSettings(next);
    statusEl.textContent = "设置已保存";
    window.setTimeout(() => {
      statusEl.textContent = "";
    }, 1200);
  });
}

initOptionsPage();
