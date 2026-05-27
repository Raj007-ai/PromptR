
import { GoogleGenAI, Type, ThinkingLevel, Modality } from "@google/genai";
import { GenerationLanguage, PromptInput, GeneratedPrompt, ImageGenerationInput, GeneratedImageResult, AspectRatio, StyleAnalysisResult, OptimizationResult } from "./types.ts";

export class StudioError extends Error {
  constructor(public message: string, public type: 'safety' | 'network' | 'parsing' | 'generic' = 'generic') {
    super(message);
    this.name = 'StudioError';
  }
}

export const generateAIImage = async (input: ImageGenerationInput): Promise<GeneratedImageResult> => {
  const apiKey = "dummy_key_proxied";
  // API key is handled by the proxy

  const ai = new GoogleGenAI({ apiKey, httpOptions: { baseUrl: window.location.origin + "/api/gemini" } });
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
        candidateCount: input.numberOfImages || 1,
        imageConfig: {
          aspectRatio: input.aspectRatio
        }
      }
    });

    let imageUrl = '';
    let urls: string[] = [];
    let textOutput = '';

    const candidates = response.candidates || [];
    
    for (const candidate of candidates) {
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) {
          const url = `data:image/png;base64,${part.inlineData.data}`;
          if (!imageUrl) imageUrl = url;
          urls.push(url);
        } else if (part.text && !textOutput) {
          textOutput += part.text;
        }
      }
    }

    if (!imageUrl) {
      throw new StudioError("The AI failed to materialize the visual. Safety filters might have triggered.", 'safety');
    }

    return {
      url: imageUrl,
      urls: urls.length > 1 ? urls : undefined,
      revisedPrompt: textOutput || fullPrompt
    };
  } catch (error: any) {
    if (error instanceof StudioError) throw error;
    throw new StudioError(error.message || "Visual synthesis failed.", 'generic');
  }
};

export const editImageWithAI = async (imageB64: string, instruction: string, aspectRatio: AspectRatio): Promise<GeneratedImageResult> => {
  const apiKey = "dummy_key_proxied";
  // API key is handled by the proxy

  const ai = new GoogleGenAI({ apiKey, httpOptions: { baseUrl: window.location.origin + "/api/gemini" } });
  
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
  const apiKey = "dummy_key_proxied";
  if (!apiKey) {
    throw new StudioError("API Key is missing. Please check your environment.", 'network');
  }

  const ai = new GoogleGenAI({ apiKey, httpOptions: { baseUrl: window.location.origin + "/api/gemini" } });
  const modelName = input.useThinking ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
  
  const systemInstruction = `You are PromptR Architect, the world's premier AI prompt engineering authority. 
Your mission is to transform raw keywords and technical tags into a sophisticated, high-performance prompt.

STUDIO LOGIC:
1. Target Medium: The user wants a prompt specifically for ${input.targetMedium || 'Image Generation'}. Tailor the prompt's structure, vocabulary, and technical parameters to suit this medium (e.g., if Music, use musical terms; if Video, use camera movements and pacing; if Code, specify language and architecture; if Image, use visual descriptors).
2. Subject & Narrative: Derive from keywords.
3. Technical DNA: Derive from tags (${input.tags.join(', ')}). 
4. Visual Context: If an image is provided, analyze its elements to anchor the generated prompt.
${isVariation ? '5. VARIATION MODE: The user wants a slight variation of the previous intent. Change the phrasing, perspective, or focus slightly while keeping the core subject identical.' : ''}

RESPONSE FORMAT (JSON):
- "refinedPrompt": The master-level prompt optimized for high-end models for the target medium.
- "negativePrompt": Crucial constraints and artifacts to avoid (if applicable to the medium).
- "logic": Architectural reasoning.
- "styleAnalysis": Object with movements, techniques, and influences.
- "suggestedSettings": Recommended settings, tools, or parameters for the target medium.

CULTURAL NUANCE:
The output must be optimized for the ${input.language} language.`;

  const parts: any[] = [
    { text: `CONTEXTUAL INPUT:
      Target Medium: ${input.targetMedium || 'Image Generation'}
      Primary Keywords: ${input.keywords}
      Technical Tags: ${input.tags.join(', ')}
      Target Output Language: ${input.language}` }
  ];

  if (input.image) {
    const mimeType = input.image.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
    const imageData = input.image.includes(',') ? input.image.split(',')[1] : input.image;
    parts.push({
      inlineData: {
        mimeType: mimeType,
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



export const enhanceKeywords = async (keywords: string, isVisual: boolean = false): Promise<string> => {
  try {
    const apiKey = "dummy_key_proxied";
    const ai = new GoogleGenAI({ apiKey, httpOptions: { baseUrl: window.location.origin + "/api/gemini" } });
    
    const instruction = isVisual 
      ? `Transform the following user input into a highly detailed, professional-grade image prompt for Midjourney/DALL-E. Use descriptive language for lighting, texture, and artistic style. If the user included specific instructions on how to refine it (e.g., "make it cyberpunk", "add cinematic lighting"), follow them. User Input: "${keywords}". Output ONLY the refined prompt text.`
      : `Transform the following user input into architectural prompt phrases. Keep it high-end and descriptive. If the user included specific instructions on how to refine it, follow them. User Input: "${keywords}". Output: (Max 20 words, comma-separated)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: instruction,
    });
    return response.text?.trim() || keywords;
  } catch (error) {
    throw new StudioError("Refinement service failed. Proceeding with original keywords.", 'generic');
  }
};

export const suggestEnhancements = async (keywords: string, tags: string[] = [], image?: string): Promise<OptimizationResult> => {
  try {
    const apiKey = "dummy_key_proxied";
    const ai = new GoogleGenAI({ apiKey, httpOptions: { baseUrl: window.location.origin + "/api/gemini" } });
    
    const systemInstruction = `You are an AI Prompt Optimizer. 
Your goal is to take a set of keywords, tags, and optionally an image, and suggest ways to optimize the prompt for maximum impact.

Analyze:
1. Keywords: Are they specific enough? Do they lack sensory details?
2. Tags: Are they redundant or missing key technical descriptors?
3. Context: How can the structure be improved (e.g., [Subject], [Action], [Environment], [Lighting], [Style])?

Return a JSON object with:
- optimizedKeywords: A more vivid, descriptive version of the user's keywords (max 25 words).
- recommendedTags: 5-10 technical tags that would enhance the output.
- structureSuggestion: A blueprint of how to structure the final prompt for this specific concept.
- reasoning: A brief explanation of why these changes were suggested.

RESPONSE FORMAT (JSON ONLY):
{
  "optimizedKeywords": "...",
  "recommendedTags": ["...", "..."],
  "structureSuggestion": "...",
  "reasoning": "..."
}`;

    const contents: any[] = [`User Keywords: "${keywords}"\nCurrent Tags: [${tags.join(', ')}]`];
    
    if (image) {
      contents.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: image.split(',')[1]
        }
      });
      contents.push(`Analyze the provided image for context.`);
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            optimizedKeywords: { type: Type.STRING },
            recommendedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
            structureSuggestion: { type: Type.STRING },
            reasoning: { type: Type.STRING }
          },
          required: ["optimizedKeywords", "recommendedTags", "structureSuggestion", "reasoning"]
        }
      }
    });

    const cleanJson = response.text?.replace(/^```json\n?|```$/g, '').trim();
    if (!cleanJson) throw new Error("Empty response");
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Optimization failed:", error);
    throw new StudioError("Smart Optimization service failed. Try again soon.", 'generic');
  }
};

export const analyzeArtisticStyle = async (input: { image?: string, description?: string }): Promise<StyleAnalysisResult> => {
  const apiKey = "dummy_key_proxied";
  // API key is handled by the proxy

  const ai = new GoogleGenAI({ apiKey, httpOptions: { baseUrl: window.location.origin + "/api/gemini" } });
  const parts: any[] = [];

  if (input.image) {
    const mimeType = input.image.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
    const imageData = input.image.includes(',') ? input.image.split(',')[1] : input.image;
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: imageData
      }
    });
  }

  if (input.image && input.description) {
    parts.push({ text: `Analyze the artistic style of this image, taking into account this description: ${input.description}` });
  } else if (input.description) {
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

export const generateSpeechTTS = async (text: string, tone: string = 'neutral'): Promise<string> => {
  const apiKey = "dummy_key_proxied";
  // API key is handled by the proxy

  const ai = new GoogleGenAI({ apiKey, httpOptions: { baseUrl: window.location.origin + "/api/gemini" } });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say this with a ${tone} tone: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData || !inlineData.data) {
      throw new StudioError("No audio returned by the model.");
    }
    const mimeType = inlineData.mimeType || 'audio/wav';
    return `data:${mimeType};base64,${inlineData.data}`;
  } catch (error: any) {
    throw new StudioError(error.message || "Failed to generate speech.", 'generic');
  }
};
