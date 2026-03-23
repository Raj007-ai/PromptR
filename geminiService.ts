
import { GoogleGenAI, Type, ThinkingLevel, Modality } from "@google/genai";
import { GenerationLanguage, PromptInput, GeneratedPrompt, BatchVariationResult, ImageGenerationInput, GeneratedImageResult, AspectRatio, StyleAnalysisResult } from "./types.ts";

export class StudioError extends Error {
  constructor(public message: string, public type: 'safety' | 'network' | 'parsing' | 'generic' = 'generic') {
    super(message);
    this.name = 'StudioError';
  }
}

export const generateAIImage = async (input: ImageGenerationInput): Promise<GeneratedImageResult> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new StudioError("API Key is missing.", 'network');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const fullPrompt = input.style 
    ? `Style: ${input.style}. Subject: ${input.prompt}. Constraints: ${input.negativePrompt || 'None'}` 
    : input.prompt;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: fullPrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: input.aspectRatio
        }
      }
    });

    let imageUrl = '';
    let textOutput = '';

    const candidates = response.candidates || [];
    const firstCandidate = candidates[0];
    const parts = firstCandidate?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      } else if (part.text) {
        textOutput += part.text;
      }
    }

    if (!imageUrl) {
      throw new StudioError("The AI failed to materialize the visual. Safety filters might have triggered.", 'safety');
    }

    return {
      url: imageUrl,
      revisedPrompt: textOutput || fullPrompt
    };
  } catch (error: any) {
    if (error instanceof StudioError) throw error;
    throw new StudioError(error.message || "Visual synthesis failed.", 'generic');
  }
};

export const editImageWithAI = async (imageB64: string, instruction: string, aspectRatio: AspectRatio): Promise<GeneratedImageResult> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new StudioError("API Key is missing.", 'network');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageB64.includes(',') ? imageB64.split(',')[1] : imageB64,
              mimeType: 'image/png'
            }
          },
          { text: instruction }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    });

    let imageUrl = '';
    let textOutput = '';

    const candidates = response.candidates || [];
    const firstCandidate = candidates[0];
    const parts = firstCandidate?.content?.parts || [];

    for (const part of parts) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      } else if (part.text) {
        textOutput += part.text;
      }
    }

    if (!imageUrl) {
      throw new StudioError("Image refinement failed. Safety filters may have blocked the edit.", 'safety');
    }

    return {
      url: imageUrl,
      revisedPrompt: textOutput || instruction
    };
  } catch (error: any) {
    if (error instanceof StudioError) throw error;
    throw new StudioError(error.message || "Visual refinement failed.", 'generic');
  }
};

export const generateAIPrompt = async (input: PromptInput, isVariation: boolean = false): Promise<GeneratedPrompt> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new StudioError("API Key is missing. Please check your environment.", 'network');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const modelName = input.useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  const systemInstruction = `You are PromptR Architect, the world's premier AI prompt engineering authority. 
Your mission is to transform raw keywords and technical tags into a sophisticated, high-performance prompt.

STUDIO LOGIC:
1. Subject & Narrative: Derive from keywords.
2. Technical DNA: Derive from tags (${input.tags.join(', ')}). 
3. Visual Context: If an image is provided, analyze its lighting, composition, and mood to anchor the generated prompt.
${isVariation ? '4. VARIATION MODE: The user wants a slight variation of the previous intent. Change the phrasing, perspective, or focus slightly while keeping the core subject identical.' : ''}

RESPONSE FORMAT (JSON):
- "refinedPrompt": The master-level prompt optimized for high-end models.
- "negativePrompt": Crucial constraints and artifacts to avoid.
- "logic": Architectural reasoning.
- "styleAnalysis": Object with movements, techniques, and influences.
- "suggestedSettings": Recommended aspect ratios, sampling methods, etc.

CULTURAL NUANCE:
The output must be optimized for the ${input.language} language.`;

  const parts: any[] = [
    { text: `CONTEXTUAL INPUT:
      Primary Keywords: ${input.keywords}
      Technical Tags: ${input.tags.join(', ')}
      Target Output Language: ${input.language}` }
  ];

  if (input.image) {
    const imageData = input.image.includes(',') ? input.image.split(',')[1] : input.image;
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageData
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedPrompt: { type: Type.STRING },
            negativePrompt: { type: Type.STRING },
            logic: { type: Type.STRING },
            styleAnalysis: {
              type: Type.OBJECT,
              properties: {
                movements: { type: Type.ARRAY, items: { type: Type.STRING } },
                techniques: { type: Type.ARRAY, items: { type: Type.STRING } },
                influences: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["movements", "techniques", "influences"]
            },
            suggestedSettings: { type: Type.STRING },
          },
          required: ["refinedPrompt", "logic", "styleAnalysis"]
        },
        thinkingConfig: input.useThinking ? { thinkingLevel: ThinkingLevel.HIGH } : undefined,
        tools: input.useSearch ? [{ googleSearch: {} }] : undefined,
      }
    });

    if (!response.text) {
      if (response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new StudioError("Content blocked by safety filters. Try a different concept.", 'safety');
      }
      throw new StudioError("The engine returned an empty vision. Please try refining your keywords.", 'generic');
    }

    try {
      const cleanJson = response.text.replace(/^```json\n?|```$/g, '').trim();
      const data = JSON.parse(cleanJson);
      const references = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      return {
        ...data,
        references: Array.isArray(references) ? references : [],
        inputContext: {
          keywords: input.keywords,
          tags: [...input.tags],
          language: input.language,
          useSearch: input.useSearch,
          useThinking: input.useThinking
        }
      };
    } catch (parseError) {
      console.error("JSON Parsing Error", parseError, response.text);
      throw new StudioError("The engine failed to structure the blueprint correctly. Retrying might help.", 'parsing');
    }
  } catch (error: any) {
    if (error instanceof StudioError) throw error;
    
    const msg = error.message || "";
    if (msg.includes("429")) throw new StudioError("Too many requests. Please wait a moment before trying again.", 'network');
    if (msg.includes("500") || msg.includes("503")) throw new StudioError("The AI service is temporarily unavailable. Try again later.", 'network');
    
    throw new StudioError(error.message || "An unexpected error occurred during synthesis.", 'generic');
  }
};

export const generatePromptBatch = async (prompts: string[]): Promise<BatchVariationResult> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new StudioError("API Key is missing.", 'network');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const systemInstruction = `You are PromptR Architect. 
You will be given a collection of high-end AI prompts. 
Your task is to:
1. Synthesize the core collective themes, styles, and artistic directions.
2. Generate 4 new, unique prompts that are subtle variations or expansions of these themes.
3. Ensure the new prompts maintain the original intent but offer fresh creative perspectives (e.g., changing lighting, medium, or narrative angle).

RESPONSE FORMAT (JSON):
- "variations": Array of 4 strings (the new prompts).
- "themeSynthesis": A brief architectural summary of the shared DNA found in the inputs.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `INPUT PROMPTS FOR SYNTHESIS:
      ${prompts.map((p, i) => `Prompt ${i+1}: ${p}`).join('\n')}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            variations: { type: Type.ARRAY, items: { type: Type.STRING } },
            themeSynthesis: { type: Type.STRING }
          },
          required: ["variations", "themeSynthesis"]
        }
      }
    });

    if (!response.text) throw new StudioError("Failed to synthesize batch variations.");
    
    try {
      const cleanJson = response.text.replace(/^```json\n?|```$/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.error("Batch Synthesis Parse Error", e, response.text);
      throw new StudioError("Failed to parse batch synthesis results.", 'parsing');
    }
  } catch (error: any) {
    throw new StudioError(error.message || "Batch synthesis failed.", 'generic');
  }
};

export const enhanceKeywords = async (keywords: string, isVisual: boolean = false): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
    const instruction = isVisual 
      ? `Transform these simple visual concepts into a highly detailed, professional-grade image prompt for Midjourney/DALL-E. Use descriptive language for lighting, texture, and artistic style. Keywords: "${keywords}". Output ONLY the refined prompt text.`
      : `Transform these simple concepts into architectural prompt phrases. Keep it high-end and descriptive. Input: "${keywords}". Output: (Max 20 words, comma-separated)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: instruction,
    });
    return response.text?.trim() || keywords;
  } catch (error) {
    throw new StudioError("Refinement service failed. Proceeding with original keywords.", 'generic');
  }
};

export const analyzeArtisticStyle = async (input: { image?: string, description?: string }): Promise<StyleAnalysisResult> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new StudioError("API Key is missing.", 'network');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const parts: any[] = [];

  if (input.image) {
    const imageData = input.image.includes(',') ? input.image.split(',')[1] : input.image;
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageData
      }
    });
  }

  if (input.description) {
    parts.push({ text: `Analyze this artistic description: ${input.description}` });
  } else if (input.image) {
    parts.push({ text: "Analyze the artistic style of this image." });
  }

  const systemInstruction = `You are a world-class art historian and prompt engineer.
Analyze the provided image or description to extract its artistic DNA.
Provide a structured analysis that can be used to recreate this style in AI generators.

RESPONSE FORMAT (JSON):
- "summary": A concise but deep analysis of the style.
- "keywords": 5-8 descriptive keywords for the subject and mood.
- "tags": 5-8 technical tags (lighting, composition, medium).
- "movements": Artistic movements identified (e.g., Surrealism, Baroque).
- "techniques": Technical methods identified (e.g., Chiaroscuro, Impasto).`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            movements: { type: Type.ARRAY, items: { type: Type.STRING } },
            techniques: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["summary", "keywords", "tags", "movements", "techniques"]
        }
      }
    });

    if (!response.text) throw new StudioError("Style analysis returned no data.");
    
    try {
      const cleanJson = response.text.replace(/^```json\n?|```$/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      throw new StudioError("Failed to parse style analysis results.", 'parsing');
    }
  } catch (error: any) {
    if (error instanceof StudioError) throw error;
    throw new StudioError(error.message || "Style analysis failed.", 'generic');
  }
};
