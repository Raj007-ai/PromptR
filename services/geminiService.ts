
// @google/genai used for AI prompt generation and TTS services
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GenerationLanguage, PromptInput, GeneratedPrompt } from "../types";

export const generateAIPrompt = async (input: PromptInput): Promise<GeneratedPrompt> => {
  // Use API key directly from environment variable
  const ai = new GoogleGenAI({ apiKey: "dummy_key_proxied", httpOptions: { baseUrl: window.location.origin + "/api/gemini" } });
  
  const modelName = input.useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  const config: any = {};
  
  if (input.useThinking) {
    config.thinkingConfig = { thinkingBudget: 32768 };
  }
  
  if (input.useSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  // Fix: Removed reference to 'input.tags' as it does not exist on the PromptInput type (Line 25 fix)
  const parts: any[] = [
    { text: `You are a world-class AI prompt engineer. Create a detailed, effective prompt based on the following:
      Keywords: ${input.keywords}
      Target Language: ${input.language}
      
      Requirements:
      1. If the language is Hinglish, use a natural blend of Hindi and English as commonly spoken online.
      2. If the language is Hindi, use modern Hindi script.
      3. The output should be the prompt itself, followed by brief usage tips.
      4. Ensure the prompt is optimized for leading AI models (DALL-E, Midjourney, or LLMs).
      5. If Search is enabled, incorporate recent trends or accurate factual contexts if relevant.` }
  ];

  if (input.image) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: input.image.split(',')[1]
      }
    });
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts },
    config
  });

  const content = response.text || "Error generating prompt.";
  const references = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  // Fix: satisfies GeneratedPrompt interface requirements
  return {
    refinedPrompt: content,
    references: references.map((chunk: any) => chunk)
  };
};

export const editImageWithAI = async (imageB64: string, instruction: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: "dummy_key_proxied", httpOptions: { baseUrl: window.location.origin + "/api/gemini" } });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: imageB64.split(',')[1],
            mimeType: 'image/jpeg'
          }
        },
        { text: instruction }
      ]
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("No image was generated in the response.");
};

export const generateTTS = async (text: string): Promise<ArrayBuffer> => {
  const ai = new GoogleGenAI({ apiKey: "dummy_key_proxied", httpOptions: { baseUrl: window.location.origin + "/api/gemini" } });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      // Modality must be an array with single AUDIO element
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio data received");
  
  return decode(base64Audio).buffer;
};

// Standard base64 decoding implementation for PCM data processing
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
