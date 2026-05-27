import { test, expect, mock, beforeEach, describe } from "bun:test";
import { generateAIPrompt } from "../services/geminiService";
import { GenerationLanguage } from "../types";

// Setup global mock for the genai SDK
let mockGenerateContent = mock(async (args: any): Promise<any> => {
  return {
    text: "Refined AI prompt output",
    candidates: [{
      groundingMetadata: {
        groundingChunks: []
      }
    }]
  };
});

mock.module("@google/genai", () => {
  return {
    GoogleGenAI: mock((config) => {
      return {
        models: {
          generateContent: mockGenerateContent
        }
      };
    }),
    Type: {},
    Modality: { AUDIO: "AUDIO" }
  };
});

describe("geminiService - generateAIPrompt", () => {
  beforeEach(() => {
    mockGenerateContent.mockClear();
  });

  test("generates a prompt with default settings (happy path)", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: "Default response",
      candidates: []
    } as any);

    const result = await generateAIPrompt({
      keywords: "cats in space",
      tags: [],
      language: GenerationLanguage.ENGLISH,
      useSearch: false,
      useThinking: false
    });

    expect(result.refinedPrompt).toBe("Default response");
    expect(result.references).toEqual([]);

    // Verify call structure
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArgs = (mockGenerateContent.mock.calls as any)[0][0];
    expect(callArgs.model).toBe("gemini-3-flash-preview");
    expect(callArgs.config).toEqual({});
    expect(callArgs.contents.parts[0].text).toContain("cats in space");
    expect(callArgs.contents.parts[0].text).toContain("English");
  });

  test("applies thinking configuration when useThinking is true", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: "Thinking response" } as any);

    await generateAIPrompt({
      keywords: "complex task",
      tags: [],
      language: GenerationLanguage.ENGLISH,
      useSearch: false,
      useThinking: true
    });

    const callArgs = (mockGenerateContent.mock.calls as any)[0][0];
    expect(callArgs.model).toBe("gemini-3-pro-preview");
    expect(callArgs.config.thinkingConfig).toEqual({ thinkingBudget: 32768 });
  });

  test("applies search tools when useSearch is true", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: "Search response" } as any);

    await generateAIPrompt({
      keywords: "current events",
      tags: [],
      language: GenerationLanguage.ENGLISH,
      useSearch: true,
      useThinking: false
    });

    const callArgs = (mockGenerateContent.mock.calls as any)[0][0];
    expect(callArgs.config.tools).toEqual([{ googleSearch: {} }]);
  });

  test("processes and attaches inline image data correctly", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: "Image response" } as any);

    await generateAIPrompt({
      keywords: "describe this",
      tags: [],
      language: GenerationLanguage.ENGLISH,
      useSearch: false,
      useThinking: false,
      image: "data:image/jpeg;base64,mockbase64data"
    });

    const callArgs = (mockGenerateContent.mock.calls as any)[0][0];
    expect(callArgs.contents.parts.length).toBe(2);
    expect(callArgs.contents.parts[1]).toEqual({
      inlineData: {
        mimeType: 'image/jpeg',
        data: 'mockbase64data'
      }
    });
  });

  test("maps grounding chunks to references correctly", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: "Grounded response",
      candidates: [{
        groundingMetadata: {
          groundingChunks: [
            { web: { uri: "https://example.com", title: "Example" } }
          ]
        }
      }]
    } as any);

    const result = await generateAIPrompt({
      keywords: "facts",
      tags: [],
      language: GenerationLanguage.ENGLISH,
      useSearch: true,
      useThinking: false
    });

    expect(result.references).toEqual([
      { web: { uri: "https://example.com", title: "Example" } }
    ]);
  });

  test("handles undefined response text gracefully", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: undefined,
      candidates: []
    } as any);

    const result = await generateAIPrompt({
      keywords: "fail task",
      tags: [],
      language: GenerationLanguage.ENGLISH,
      useSearch: false,
      useThinking: false
    });

    expect(result.refinedPrompt).toBe("Error generating prompt.");
  });
});
