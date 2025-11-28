import { GoogleGenAI } from "@google/genai";

export const generateBirthdayWish = async (childName: string, age: string = "не указан"): Promise<string> => {
  // In a real production app, this key should come from a secure backend proxy.
  // For this client-side demo per instructions, we assume process.env.API_KEY is available.
  // Ideally, the user of this code must set up the environment variable or replace the string.
  
  // NOTE: If API_KEY is missing, we return a mock string to prevent app crash during UI testing.
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found. Returning mock wish.");
    return `С Днем Рождения, ${childName}! Желаем счастья и радости! (API Key missing)`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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