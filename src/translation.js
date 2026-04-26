function sanitizeSelectionText(text) {
  if (!text) return "";
  return String(text).replace(/\s+/g, " ").trim().slice(0, QUICK_TRANSLATOR_MAX_TEXT_LENGTH);
}

function detectSourceLanguage(text) {
  if (/[\u4e00-\u9fff]/.test(text)) return "zh-CN";
  if (/[\u3040-\u30ff]/.test(text)) return "ja";
  if (/[\uac00-\ud7af]/.test(text)) return "ko";
  return "en";
}

function buildMyMemoryUrl(text, sourceLanguage, targetLanguage) {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `${sourceLanguage}|${targetLanguage}`);
  return url.toString();
}

function hasLetters(text) {
  return /[A-Za-z\u00C0-\u024F\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(text);
}

function isNumericLikeText(text) {
  return /^[\d\s.,:;!?()[\]{}\-+/\\%$#@&*_="']+$/.test(text);
}

function isLikelyBadTranslation(sourceText, translatedText) {
  const source = String(sourceText || "").trim();
  const translated = String(translatedText || "").trim();
  if (!translated) return true;

  // Typical noisy responses from public APIs are numeric-only fragments.
  if (translated.length > 0 && translated.length < 3 && !hasLetters(translated)) return true;
  if (isNumericLikeText(translated) && hasLetters(source)) return true;
  return false;
}

async function requestMyMemory(text, sourceLanguage, targetLanguage) {
  const response = await fetch(buildMyMemoryUrl(text, sourceLanguage, targetLanguage));
  if (!response.ok) throw new Error(`MyMemory HTTP ${response.status}`);
  const data = await response.json();
  return data?.responseData?.translatedText || "";
}

async function requestLibreTranslate(text, sourceLanguage, targetLanguage) {
  const response = await fetch("https://libretranslate.de/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      q: text,
      source: sourceLanguage,
      target: targetLanguage.split("-")[0],
      format: "text"
    })
  });
  if (!response.ok) throw new Error(`LibreTranslate HTTP ${response.status}`);
  const data = await response.json();
  return data?.translatedText || "";
}

async function requestByEngine(engine, text, sourceLanguage, targetLanguage) {
  if (engine === "libretranslate") {
    return requestLibreTranslate(text, sourceLanguage, targetLanguage);
  }
  return requestMyMemory(text, sourceLanguage, targetLanguage);
}

async function translateText(text, targetLanguage, translationEngine = "mymemory") {
  const cleanText = sanitizeSelectionText(text);
  if (!cleanText) {
    return {
      sourceText: "",
      translatedText: "",
      sourceLanguage: "en",
      targetLanguage
    };
  }

  const sourceLanguage = detectSourceLanguage(cleanText);
  const engineOrder =
    translationEngine === "libretranslate"
      ? ["libretranslate", "mymemory"]
      : ["mymemory", "libretranslate"];

  for (const engine of engineOrder) {
    try {
      const translatedText = await requestByEngine(
        engine,
        cleanText,
        sourceLanguage,
        targetLanguage
      );
      if (translatedText && !isLikelyBadTranslation(cleanText, translatedText)) {
        console.info("QuickTranslator Multi 翻译成功", {
          engine,
          sourceLanguage,
          targetLanguage,
          sourceText: cleanText,
          translatedText
        });
        return {
          sourceText: cleanText,
          translatedText,
          sourceLanguage,
          targetLanguage,
          engine
        };
      }
      console.warn("QuickTranslator Multi 翻译结果疑似异常，尝试回退引擎", {
        engine,
        sourceLanguage,
        targetLanguage,
        sourceText: cleanText,
        translatedText
      });
    } catch (error) {
      console.error(`QuickTranslator Multi ${engine} 请求失败`, error);
    }
  }

  return {
    sourceText: cleanText,
    translatedText: "翻译服务暂时不可用，请稍后重试。",
    sourceLanguage,
    targetLanguage,
    engine: "none"
  };
}
