let quickTranslatorState = {
  selectionToolbar: null,
  selectionTranslateButton: null,
  selectionSpeakButton: null,
  panel: null,
  currentSelection: "",
  settings: null,
  lastTranslation: null
};

function matchesShortcut(event, shortcut) {
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  const ctrlOrMetaExpected = isMac ? shortcut.metaKey : shortcut.ctrlKey;
  const ctrlOrMetaPressed = isMac ? event.metaKey : event.ctrlKey;
  const key = String(event.key || "").toUpperCase();

  return (
    ctrlOrMetaExpected === ctrlOrMetaPressed &&
    Boolean(shortcut.shiftKey) === event.shiftKey &&
    Boolean(shortcut.altKey) === event.altKey &&
    key === shortcut.key
  );
}

function inferLanguageCode(text) {
  if (/[\u4e00-\u9fff]/.test(text)) return "zh-CN";
  if (/[\u3040-\u30ff]/.test(text)) return "ja";
  if (/[\uac00-\ud7af]/.test(text)) return "ko";
  return "en";
}

function toSpeechLangCode(languageCode) {
  const normalized = String(languageCode || "").toLowerCase();
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("ja")) return "ja-JP";
  if (normalized.startsWith("ko")) return "ko-KR";
  if (normalized.startsWith("fr")) return "fr-FR";
  if (normalized.startsWith("es")) return "es-ES";
  return "en-US";
}

async function getVoicesReady(timeoutMs = 600) {
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) return voices;

  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(speechSynthesis.getVoices());
    };
    const onChange = () => done();
    speechSynthesis.addEventListener("voiceschanged", onChange, { once: true });
    window.setTimeout(done, timeoutMs);
  });
}

function pickBestVoice(voices, speechLangCode) {
  if (!voices.length) return null;
  const exact = voices.find((voice) => voice.lang?.toLowerCase() === speechLangCode.toLowerCase());
  if (exact) return exact;

  const prefix = speechLangCode.split("-")[0].toLowerCase();
  const byPrefix = voices.find((voice) => voice.lang?.toLowerCase().startsWith(prefix));
  if (byPrefix) return byPrefix;

  return voices.find((voice) => voice.default) || voices[0];
}

async function speakTextWithBestVoice(text, languageCode) {
  if (!("speechSynthesis" in window) || !text) return;

  const speechLangCode = toSpeechLangCode(languageCode);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = speechLangCode;

  const voices = await getVoicesReady();
  const voice = pickBestVoice(voices, speechLangCode);
  if (voice) utterance.voice = voice;

  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function createSelectionToolbar() {
  const toolbar = document.createElement("div");
  toolbar.className = "qt-selection-toolbar";

  const translateButton = document.createElement("button");
  translateButton.className = "qt-selection-action";
  translateButton.type = "button";
  translateButton.innerHTML = `<span class="qt-btn-icon">T</span><span>翻译</span>`;
  translateButton.addEventListener("click", () => {
    if (quickTranslatorState.currentSelection) {
      openTranslatePanel(quickTranslatorState.currentSelection);
    }
    hideSelectionToolbar();
  });

  const speakButton = document.createElement("button");
  speakButton.className = "qt-selection-action qt-selection-action-secondary";
  speakButton.type = "button";
  speakButton.innerHTML = `<span class="qt-btn-icon">S</span><span>朗读</span>`;
  speakButton.addEventListener("click", () => {
    const text = quickTranslatorState.currentSelection;
    const languageCode = inferLanguageCode(text);
    speakTextWithBestVoice(text, languageCode);
    hideSelectionToolbar();
  });

  toolbar.appendChild(translateButton);
  toolbar.appendChild(speakButton);
  document.body.appendChild(toolbar);

  quickTranslatorState.selectionToolbar = toolbar;
  quickTranslatorState.selectionTranslateButton = translateButton;
  quickTranslatorState.selectionSpeakButton = speakButton;
}

function showSelectionToolbar(range) {
  if (!quickTranslatorState.selectionToolbar) createSelectionToolbar();

  const rect = range.getBoundingClientRect();
  const toolbar = quickTranslatorState.selectionToolbar;
  toolbar.style.top = `${window.scrollY + rect.bottom + 8}px`;
  toolbar.style.left = `${window.scrollX + rect.right - 140}px`;
  toolbar.classList.add("visible");
}

function hideSelectionToolbar() {
  if (quickTranslatorState.selectionToolbar) {
    quickTranslatorState.selectionToolbar.classList.remove("visible");
  }
}

function getNextFontSize(currentFontSize, step) {
  const currentIndex = QUICK_TRANSLATOR_FONT_SIZES.indexOf(currentFontSize);
  const safeIndex = currentIndex === -1 ? 2 : currentIndex;
  const nextIndex = Math.max(
    0,
    Math.min(QUICK_TRANSLATOR_FONT_SIZES.length - 1, safeIndex + step)
  );
  return QUICK_TRANSLATOR_FONT_SIZES[nextIndex];
}

function buildPanel() {
  const panel = document.createElement("div");
  panel.className = "qt-panel";
  panel.innerHTML = `
    <header class="qt-panel-header">
      <strong>LexiTranslate - 划词翻译助手</strong>
      <div class="qt-header-actions">
        <button type="button" data-action="font-decrease">A-</button>
        <button type="button" data-action="font-increase">A+</button>
        <button type="button" data-action="close">×</button>
      </div>
    </header>
    <main class="qt-panel-body">
      <section>
        <div class="qt-section-title">
          <h4>原文</h4>
          <div class="qt-inline-actions">
            <button type="button" data-action="speak-source">朗读</button>
          </div>
        </div>
        <p class="qt-source"></p>
      </section>
      <section>
        <div class="qt-section-title">
          <h4>译文</h4>
          <div class="qt-inline-actions">
            <button type="button" data-action="copy">复制</button>
            <button type="button" data-action="speak-translation">朗读</button>
          </div>
        </div>
        <p class="qt-translation"></p>
      </section>
    </main>
  `;

  panel.addEventListener("click", async (event) => {
    const target = event.target.closest("button[data-action]");
    if (!target) return;

    const action = target.getAttribute("data-action");
    if (action === "close") {
      panel.classList.remove("visible");
      return;
    }
    if (action === "font-decrease" || action === "font-increase") {
      const step = action === "font-increase" ? 1 : -1;
      const fontSize = getNextFontSize(quickTranslatorState.settings.fontSize, step);
      panel.dataset.fontSize = fontSize;
      const next = { ...quickTranslatorState.settings, fontSize };
      quickTranslatorState.settings = await saveSettings(next);
      return;
    }
    if (action === "copy") {
      const text = panel.querySelector(".qt-translation").textContent || "";
      navigator.clipboard.writeText(text).catch(() => {
        console.warn("复制失败：页面权限限制");
      });
      return;
    }

    if (action === "speak-source" || action === "speak-translation") {
      const selector = action === "speak-source" ? ".qt-source" : ".qt-translation";
      const text = panel.querySelector(selector).textContent || "";
      const languageCode =
        action === "speak-source"
          ? quickTranslatorState.lastTranslation?.sourceLanguage || inferLanguageCode(text)
          : quickTranslatorState.lastTranslation?.targetLanguage ||
            quickTranslatorState.settings.targetLanguage;
      speakTextWithBestVoice(text, languageCode);
    }
  });

  document.body.appendChild(panel);
  quickTranslatorState.panel = panel;
}

async function openTranslatePanel(selectedText) {
  if (!quickTranslatorState.panel) buildPanel();
  const panel = quickTranslatorState.panel;
  const sourceEl = panel.querySelector(".qt-source");
  const translationEl = panel.querySelector(".qt-translation");

  panel.dataset.theme = quickTranslatorState.settings.theme;
  panel.dataset.fontSize = quickTranslatorState.settings.fontSize;
  sourceEl.textContent = selectedText;
  translationEl.textContent = "翻译中...";
  panel.classList.add("visible");

  const result = await translateText(
    selectedText,
    quickTranslatorState.settings.targetLanguage,
    quickTranslatorState.settings.translationEngine
  );
  quickTranslatorState.lastTranslation = result;
  sourceEl.textContent = result.sourceText;
  translationEl.textContent = result.translatedText;
}

function setupSelectionEvents() {
  document.addEventListener("mouseup", () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const text = sanitizeSelectionText(selection.toString());
    if (!text) {
      hideSelectionToolbar();
      return;
    }
    quickTranslatorState.currentSelection = text;
    showSelectionToolbar(selection.getRangeAt(0));
  });

  document.addEventListener("mousedown", (event) => {
    if (quickTranslatorState.panel?.contains(event.target)) return;
    if (quickTranslatorState.selectionToolbar?.contains(event.target)) return;
    hideSelectionToolbar();
  });

  document.addEventListener("keydown", (event) => {
    if (matchesShortcut(event, quickTranslatorState.settings.shortcut)) {
      const text = sanitizeSelectionText(window.getSelection()?.toString() || "");
      if (text) {
        quickTranslatorState.currentSelection = text;
        openTranslatePanel(text);
      }
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "quick-translate-command") return;
    const text = sanitizeSelectionText(window.getSelection()?.toString() || "");
    if (text) {
      quickTranslatorState.currentSelection = text;
      openTranslatePanel(text);
    }
  });
}

async function initQuickTranslator() {
  quickTranslatorState.settings = await getSettings();
  setupSelectionEvents();
}

initQuickTranslator();
