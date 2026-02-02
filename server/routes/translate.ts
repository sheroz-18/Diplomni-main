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

// Mock translation database for common words
const mockTranslations: Record<string, Record<string, string>> = {
  ru: {
    en: {
      привет: "hello",
      пока: "goodbye",
      спасибо: "thank you",
      пожалуйста: "please",
      да: "yes",
      нет: "no",
      машина: "car",
      дом: "house",
      кошка: "cat",
      собака: "dog",
      вода: "water",
      огонь: "fire",
      любовь: "love",
      друг: "friend",
      семья: "family",
    },
    tj: {
      привет: "салом",
      пока: "хода",
      спасибо: "шукрон",
      пожалуйста: "лутфан",
      да: "ҳа",
      нет: "не",
      машина: "мошин",
      дом: "хона",
      кошка: "гурба",
      собака: "саг",
      вода: "об",
      огонь: "оташ",
      любовь: "муҳаббат",
      друг: "дўст",
      семья: "оила",
    },
    fr: {
      привет: "bonjour",
      пока: "au revoir",
      спасибо: "merci",
      пожалуйста: "s'il vous plaît",
      да: "oui",
      нет: "non",
      машина: "voiture",
      дом: "maison",
      кошка: "chat",
      собака: "chien",
      вода: "eau",
      огонь: "feu",
      любовь: "amour",
      друг: "ami",
      семья: "famille",
    },
    es: {
      привет: "hola",
      пока: "adiós",
      спасибо: "gracias",
      пожалуйста: "por favor",
      да: "sí",
      нет: "no",
      машина: "coche",
      дом: "casa",
      кошка: "gato",
      собака: "perro",
      вода: "agua",
      огонь: "fuego",
      любовь: "amor",
      друг: "amigo",
      семья: "familia",
    },
  },
  en: {
    ru: {
      hello: "привет",
      goodbye: "пока",
      "thank you": "спасибо",
      please: "пожалуйста",
      yes: "да",
      no: "нет",
      car: "машина",
      house: "дом",
      cat: "кошка",
      dog: "собака",
      water: "вода",
      fire: "огонь",
      love: "любовь",
      friend: "друг",
      family: "семья",
    },
    tj: {
      hello: "салом",
      goodbye: "хода",
      "thank you": "шукрон",
      please: "лутфан",
      yes: "ҳа",
      no: "не",
      car: "мошин",
      house: "хона",
      cat: "гурба",
      dog: "саг",
      water: "об",
      fire: "оташ",
      love: "муҳаббат",
      friend: "дўст",
      family: "оила",
    },
  },
  tj: {
    ru: {
      салом: "привет",
      хода: "пока",
      шукрон: "спасибо",
      лутфан: "пожалуйста",
      ҳа: "да",
      не: "нет",
      мошин: "машина",
      хона: "дом",
      гурба: "кошка",
      саг: "собака",
      об: "вода",
      оташ: "огонь",
      муҳаббат: "любовь",
      дўст: "друг",
      оила: "семья",
    },
    en: {
      салом: "hello",
      хода: "goodbye",
      шукрон: "thank you",
      лутфан: "please",
      ҳа: "yes",
      не: "no",
      мошин: "car",
      хона: "house",
      гурба: "cat",
      саг: "dog",
      об: "water",
      оташ: "fire",
      муҳаббат: "love",
      дўст: "friend",
      оила: "family",
    },
  },
};

function translateWithMock(
  text: string,
  sourceLang: string,
  targetLang: string
): string {
  if (sourceLang === targetLang) {
    return text;
  }

  const words = text.toLowerCase().trim().split(/\s+/);
  const translations = mockTranslations[sourceLang]?.[targetLang];

  if (!translations) {
    return text; // Return original if no translations available
  }

  const translatedWords = words.map((word) => {
    // Try exact match first
    if (translations[word]) {
      return translations[word];
    }

    // Try without punctuation
    const cleanWord = word.replace(/[.,!?;:]/g, "");
    if (translations[cleanWord]) {
      return translations[cleanWord];
    }

    return word; // Return original word if no translation found
  });

  return translatedWords.join(" ");
}

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

    // Try mock translation first
    let translatedText = translateWithMock(text, sourceLang, targetLang);

    // Try LibreTranslate API if mock didn't provide full translation
    if (translatedText === text && sourceLang !== targetLang) {
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
          translatedText = data.translatedText || text;
        }
      } catch (error) {
        console.error("LibreTranslate error:", error);
        // Continue with mock translation result
      }
    }

    const response: TranslationResponse = {
      originalText: text,
      translatedText,
      sourceLang,
      targetLang,
    };

    res.json(response);
  } catch (error) {
    console.error("Translation error:", error);
    res.status(500).json({ error: "Translation failed" });
  }
};
