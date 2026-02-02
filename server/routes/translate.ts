import { RequestHandler } from "express";
import { TranslationResponse } from "@shared/api";

// Language code mapping for LibreTranslate
const languageMap: Record<string, string> = {
  en: "en",
  tj: "fa", // Tajik maps to Persian/Farsi for LibreTranslate
  tg: "fa", // Also support legacy code
  ru: "ru",
  fr: "fr",
  es: "es",
  de: "de",
  ar: "ar",
  zh: "zh",
  ja: "ja",
  ko: "ko",
};

export const handleTranslate: RequestHandler = async (req, res) => {
  try {
    const { text, sourceLang, targetLang } = req.body;

    if (!text || !sourceLang || !targetLang) {
      return res.status(400).json({
        error: "Missing required fields: text, sourceLang, targetLang",
      });
    }

    const sourceCode = languageMap[sourceLang] || sourceLang;
    const targetCode = languageMap[targetLang] || targetLang;

    // Try LibreTranslate API first
    try {
      const libreResponse = await fetch(
        "https://api.libretranslate.de/translate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: text,
            source: sourceCode,
            target: targetCode,
          }),
        },
      );

      if (libreResponse.ok) {
        const data = await libreResponse.json();
        const response: TranslationResponse = {
          originalText: text,
          translatedText: data.translatedText || text,
          sourceLang,
          targetLang,
        };
        return res.json(response);
      }
    } catch (error) {
      console.error("LibreTranslate error, falling back to mock:", error);
    }

    // Fallback: return original text if API fails
    const response: TranslationResponse = {
      originalText: text,
      translatedText: text,
      sourceLang,
      targetLang,
    };

    res.json(response);
  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ error: "Translation failed" });
  }
};
