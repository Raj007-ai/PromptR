import { expect, test, describe, mock, beforeEach, afterEach } from "bun:test";
import { generateAIImage, StudioError } from "../geminiService";

describe("generateAIImage", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, API_KEY: "test-api-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
    mock.restore();
  });

  test("throws error if API key is missing", async () => {
    delete process.env.API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      await generateAIImage({ prompt: "test", aspectRatio: "1:1" });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(StudioError);
      expect((error as StudioError).message).toBe("API Key is missing.");
    }
  });

  test("calls GoogleGenAI with correct parameters and returns single image", async () => {
    // Dynamic import to allow re-mocking
    const mockGenerateContent = mock().mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              { inlineData: { data: "base64data1" } },
              { text: "revised prompt text" }
            ]
          }
        }
      ]
    });

    mock.module("@google/genai", () => ({
      GoogleGenAI: mock(() => ({
        models: {
          generateContent: mockGenerateContent
        }
      })),
      Type: {},
      ThinkingLevel: {},
      Modality: {}
    }));

    // Re-import to pickup new mocks
    const { generateAIImage: dynamicGenerateAIImage } = await import("../geminiService");

    const result = await dynamicGenerateAIImage({
      prompt: "test prompt",
      aspectRatio: "16:9",
      style: "Cyberpunk",
      negativePrompt: "blur"
    });

    expect(result.url).toBe("data:image/png;base64,base64data1");
    expect(result.revisedPrompt).toBe("revised prompt text");
    expect(result.urls).toBeUndefined();

    // Verify the correct payload was sent to GoogleGenAI
    expect(mockGenerateContent).toHaveBeenCalled();
    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.model).toBe("gemini-2.5-flash-image");
    expect(callArgs.contents.parts[0].text).toContain("Style: Cyberpunk");
    expect(callArgs.contents.parts[0].text).toContain("Subject: test prompt");
    expect(callArgs.contents.parts[0].text).toContain("Constraints: blur");
    expect(callArgs.config.candidateCount).toBe(1);
    expect(callArgs.config.imageConfig.aspectRatio).toBe("16:9");
  });

  test("returns multiple urls if multiple images requested", async () => {
    const mockGenerateContent = mock().mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              { inlineData: { data: "base64data1" } },
            ]
          }
        },
        {
          content: {
            parts: [
              { inlineData: { data: "base64data2" } },
            ]
          }
        }
      ]
    });

    mock.module("@google/genai", () => ({
      GoogleGenAI: mock(() => ({
        models: {
          generateContent: mockGenerateContent
        }
      })),
      Type: {},
      ThinkingLevel: {},
      Modality: {}
    }));

    const { generateAIImage: dynamicGenerateAIImage } = await import("../geminiService");

    const result = await dynamicGenerateAIImage({
      prompt: "test prompt",
      aspectRatio: "1:1",
      numberOfImages: 2
    });

    expect(result.url).toBe("data:image/png;base64,base64data1");
    expect(result.revisedPrompt).toBe("test prompt"); // Default fallback
    expect(result.urls).toBeDefined();
    expect(result.urls?.length).toBe(2);
    expect(result.urls?.[0]).toBe("data:image/png;base64,base64data1");
    expect(result.urls?.[1]).toBe("data:image/png;base64,base64data2");

    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.config.candidateCount).toBe(2);
  });

  test("throws safety error if no image url is returned", async () => {
    const mockGenerateContent = mock().mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              { text: "Only text returned, no image" }
            ]
          }
        }
      ]
    });

    mock.module("@google/genai", () => ({
      GoogleGenAI: mock(() => ({
        models: {
          generateContent: mockGenerateContent
        }
      })),
      Type: {},
      ThinkingLevel: {},
      Modality: {}
    }));

    const { generateAIImage: dynamicGenerateAIImage } = await import("../geminiService");

    try {
      await dynamicGenerateAIImage({ prompt: "test prompt", aspectRatio: "1:1" });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(StudioError);
      expect((error as StudioError).message).toBe("The AI failed to materialize the visual. Safety filters might have triggered.");
      expect((error as StudioError).type).toBe('safety');
    }
  });

  test("throws generic error if API call fails", async () => {
    const mockGenerateContent = mock().mockRejectedValue(new Error("API failure"));

    mock.module("@google/genai", () => ({
      GoogleGenAI: mock(() => ({
        models: {
          generateContent: mockGenerateContent
        }
      })),
      Type: {},
      ThinkingLevel: {},
      Modality: {}
    }));

    const { generateAIImage: dynamicGenerateAIImage } = await import("../geminiService");

    try {
      await dynamicGenerateAIImage({ prompt: "test prompt", aspectRatio: "1:1" });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(StudioError);
      expect((error as StudioError).message).toBe("API failure");
      expect((error as StudioError).type).toBe('generic');
    }
  });

  test("throws generic error if API call fails with non-StudioError", async () => {
    const mockGenerateContent = mock().mockRejectedValue({ message: "Network timeout" });

    mock.module("@google/genai", () => ({
      GoogleGenAI: mock(() => ({
        models: {
          generateContent: mockGenerateContent
        }
      })),
      Type: {},
      ThinkingLevel: {},
      Modality: {}
    }));

    const { generateAIImage: dynamicGenerateAIImage } = await import("../geminiService");

    try {
      await dynamicGenerateAIImage({ prompt: "test prompt", aspectRatio: "1:1" });
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(StudioError);
      expect((error as StudioError).message).toBe("Network timeout");
      expect((error as StudioError).type).toBe('generic');
    }
  });

  test("uses default prompt format if no style is provided", async () => {
    const mockGenerateContent = mock().mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              { inlineData: { data: "base64data1" } },
            ]
          }
        }
      ]
    });

    mock.module("@google/genai", () => ({
      GoogleGenAI: mock(() => ({
        models: {
          generateContent: mockGenerateContent
        }
      })),
      Type: {},
      ThinkingLevel: {},
      Modality: {}
    }));

    const { generateAIImage: dynamicGenerateAIImage } = await import("../geminiService");

    await dynamicGenerateAIImage({
      prompt: "simple test prompt",
      aspectRatio: "1:1"
    });

    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs.contents.parts[0].text).toBe("simple test prompt");
  });
});
