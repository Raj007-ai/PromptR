// @ts-ignore
import { test, expect, mock, describe, beforeEach } from "bun:test";
import { GoogleGenAI, Modality } from "@google/genai";

// Create mocks for different test cases
let mockGenerateContent = mock(async () => ({
  candidates: [{ content: { parts: [{ inlineData: { data: "SGVsbG8=" } }] } }]
}));

mock.module("@google/genai", () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent
      };
    },
    Modality: { AUDIO: "AUDIO" }
  };
});

import { generateTTS } from "../services/geminiService.ts";

describe("generateTTS", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, API_KEY: "test-api-key" };
    mockGenerateContent.mockClear();

    // Default success mock
    mockGenerateContent.mockImplementation(async () => ({
      candidates: [{ content: { parts: [{ inlineData: { data: "SGVsbG8=" } }] } }]
    }));
  });

  test("successfully generates TTS and returns ArrayBuffer", async () => {
    const text = "Hello world";
    const result = await generateTTS(text);

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(new TextDecoder().decode(result)).toBe("Hello");

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent.mock.calls[0][0]).toEqual({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });
  });

  test("throws error if no candidates returned", async () => {
    mockGenerateContent.mockImplementation(async () => ({
      candidates: []
    }));

    await expect(generateTTS("test")).rejects.toThrow("No audio data received");
  });

  test("throws error if candidate parts is empty", async () => {
    mockGenerateContent.mockImplementation(async () => ({
      candidates: [{ content: { parts: [] } }]
    }));

    await expect(generateTTS("test")).rejects.toThrow("No audio data received");
  });

  test("throws error if inlineData is missing", async () => {
    mockGenerateContent.mockImplementation(async () => ({
      candidates: [{ content: { parts: [{ text: "some text instead of audio" }] } }]
    }));

    await expect(generateTTS("test")).rejects.toThrow("No audio data received");
  });

  test("handles API errors gracefully", async () => {
    mockGenerateContent.mockImplementation(async () => {
      throw new Error("API Error: Quota exceeded");
    });

    await expect(generateTTS("test")).rejects.toThrow("API Error: Quota exceeded");
  });
});
