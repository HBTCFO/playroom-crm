import { GoogleGenAI } from "@google/genai";

export const generateBirthdayWish = async (childName: string, age: string = "не указан"): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY not found. Returning mock wish.");
    return `С Днем Рождения, ${childName}! Желаем счастья и радости! (API Key missing)`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `Напиши короткое, веселое и праздничное поздравление с днем рождения для ребенка по имени ${childName}. Возраст: ${age}. Используй эмодзи. Текст должен быть на русском языке.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "С Днем Рождения!";
  } catch (error) {
    console.error("Error generating wish:", error);
    return "Не удалось сгенерировать поздравление. С Днем Рождения!";
  }
};
