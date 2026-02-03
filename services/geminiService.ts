
import { GoogleGenAI, Type } from "@google/genai";
import { FaceAnalysis } from "../types";

// Always initialize GoogleGenAI right before making an API call to ensure the latest API key is used.
// process.env.API_KEY is pre-configured and accessible.

export const analyzeFace = async (base64Image: string): Promise<FaceAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Analyze this person's face for a professional hairstyle AR filter. Identify face shape, jawline structure, and hair density. Provide a structured analysis." }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          faceShape: { type: Type.STRING },
          jawline: { type: Type.STRING },
          hairDensity: { type: Type.STRING },
          recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["faceShape", "jawline", "hairDensity", "recommendations"]
      }
    }
  });

  try {
    const text = response.text;
    if (!text) throw new Error("AI failed to return analysis.");
    return JSON.parse(text) as FaceAnalysis;
  } catch (e) {
    console.error("Analysis failure:", e);
    throw new Error("Unable to read face geometry. Ensure lighting is clear.");
  }
};

export const transformHairstyle = async (base64Image: string, stylePrompt: string, colorPrompt: string): Promise<string> => {
  // High-Quality Gemini 3 Pro Image model for realistic editing
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: `Modify this high-resolution photo with professional precision. Replace ONLY the hair with a ${colorPrompt} colored ${stylePrompt}. Preserve the user's facial features, skin texture, background, and specific lighting conditions exactly. The new hairstyle must blend seamlessly into the forehead and ears with a realistic, high-fidelity hairline. Avoid any blurring or cartoonish artifacts. Studio-quality grooming.` }
      ]
    },
    config: {
      imageConfig: {
        aspectRatio: "9:16",
        imageSize: "1K" // 1K offers best balance of speed and detail for mobile
      }
    }
  });

  let transformedUrl = '';
  const candidate = response.candidates?.[0];
  if (candidate?.content?.parts) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        transformedUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }
  }

  if (!transformedUrl) {
    throw new Error("The AI rendering was blocked or failed. This can happen with very dark photos or safety filters.");
  }

  return transformedUrl;
};
