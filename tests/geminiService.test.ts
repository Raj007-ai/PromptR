import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { analyzeArtisticStyle } from '../geminiService';

const mockGenerateContent = mock();

mock.module('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent
      };
    },
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      ARRAY: 'ARRAY'
    }
  };
});

describe('analyzeArtisticStyle', () => {
  let originalEnv: typeof process.env;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.GEMINI_API_KEY = 'test-api-key';
    mockGenerateContent.mockClear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('throws an error if response text is empty', async () => {
    mockGenerateContent.mockResolvedValue({ text: "" });
    const input = { description: 'A testing description' };

    await expect(analyzeArtisticStyle(input)).rejects.toThrow("Style analysis returned no data.");
  });

  it('throws an error if json parsing fails', async () => {
    mockGenerateContent.mockResolvedValue({ text: "invalid-json {" });
    const input = { description: 'A testing description' };

    await expect(analyzeArtisticStyle(input)).rejects.toThrow("Failed to parse style analysis results.");
  });

  it('returns correctly parsed json when response is valid', async () => {
    const mockStyleResult = {
      summary: "A modern artistic representation.",
      keywords: ["modern", "artistic"],
      tags: ["digital", "abstract"],
      movements: ["abstract expressionism"],
      techniques: ["digital painting"]
    };
    mockGenerateContent.mockResolvedValue({ text: `\`\`\`json\n${JSON.stringify(mockStyleResult)}\n\`\`\`` });

    const input = { description: 'A testing description' };
    const result = await analyzeArtisticStyle(input);
    expect(result).toEqual(mockStyleResult);
  });
});
