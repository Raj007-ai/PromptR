import { mock, test, expect } from "bun:test";

const mockGenerateContent = mock();

mock.module("@google/genai", () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
      };
    },
    Type: {
      OBJECT: "OBJECT",
      STRING: "STRING",
      ARRAY: "ARRAY",
    },
    ThinkingLevel: {
      HIGH: "HIGH",
    },
    Modality: {
      AUDIO: "AUDIO",
    },
  };
});

// Import after mocking
import { analyzeArtisticStyle, StudioError } from "./geminiService";

test("analyzeArtisticStyle throws parsing error on invalid JSON", async () => {
  process.env.GEMINI_API_KEY = "test-key";

  mockGenerateContent.mockResolvedValue({
    text: "invalid json string that is not JSON"
  });

  try {
    await analyzeArtisticStyle({ description: "test" });
    expect(true).toBe(false); // Should not reach here
  } catch (error: any) {
    expect(error).toBeInstanceOf(StudioError);
    expect(error.message).toBe("Failed to parse style analysis results.");
    expect(error.type).toBe("parsing");
  }
});

test("analyzeArtisticStyle throws error when response.text is empty", async () => {
  process.env.GEMINI_API_KEY = "test-key";

  mockGenerateContent.mockResolvedValue({
    text: ""
  });

  try {
    await analyzeArtisticStyle({ description: "test" });
    expect(true).toBe(false); // Should not reach here
  } catch (error: any) {
    expect(error).toBeInstanceOf(StudioError);
    expect(error.message).toBe("Style analysis returned no data.");
    expect(error.type).toBe("generic");
  }
});

test("analyzeArtisticStyle handles successful JSON response", async () => {
  process.env.GEMINI_API_KEY = "test-key";

  const mockResult = {
    summary: "A test style",
    keywords: ["test"],
    tags: ["test"],
    movements: ["test"],
    techniques: ["test"]
  };

  mockGenerateContent.mockResolvedValue({
    text: JSON.stringify(mockResult)
  });

  const result = await analyzeArtisticStyle({ description: "test" });
  expect(result).toEqual(mockResult);
});

test("analyzeArtisticStyle handles JSON wrapped in markdown blocks", async () => {
  process.env.GEMINI_API_KEY = "test-key";

  const mockResult = {
    summary: "A test style",
    keywords: ["test"],
    tags: ["test"],
    movements: ["test"],
    techniques: ["test"]
  };

  mockGenerateContent.mockResolvedValue({
    text: "```json\n" + JSON.stringify(mockResult) + "\n```"
  });

  const result = await analyzeArtisticStyle({ description: "test" });
  expect(result).toEqual(mockResult);
});
