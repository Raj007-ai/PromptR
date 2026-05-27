import { expect, test, mock, describe } from "bun:test";
import { generateTTS } from "../services/geminiService";

// We need to keep track of the args passed to generateContent
let mockGenerateContentArgs: any;

mock.module("@google/genai", () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mock().mockImplementation((args) => {
          mockGenerateContentArgs = args;

          if (args.contents[0]?.parts[0]?.text === "trigger_error") {
            return Promise.resolve({
              candidates: [{ content: { parts: [{}] } }]
            });
          }

          // Return base64 encoded "Hello World"
          return Promise.resolve({
            candidates: [{
              content: {
                parts: [{
                  inlineData: {
                    data: "SGVsbG8gV29ybGQ="
                  }
                }]
              }
            }]
          });
        })
      };
    },
    Modality: { AUDIO: "AUDIO" }
  };
});

describe("generateTTS", () => {
  test("successfully generates and decodes TTS audio", async () => {
    // Reset args before test
    mockGenerateContentArgs = undefined;

    // Set a dummy API key for the test
    const originalApiKey = process.env.API_KEY;
    process.env.API_KEY = "test-api-key";

    try {
      const result = await generateTTS("Hello, this is a test.");

      // Verify GoogleGenAI was called with correct configuration
      expect(mockGenerateContentArgs).toBeDefined();
      expect(mockGenerateContentArgs.model).toBe("gemini-2.5-flash-preview-tts");
      expect(mockGenerateContentArgs.contents[0].parts[0].text).toBe("Hello, this is a test.");
      expect(mockGenerateContentArgs.config.responseModalities).toEqual(["AUDIO"]);
      expect(mockGenerateContentArgs.config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe("Kore");

      // Verify the returned ArrayBuffer decodes correctly
      // "SGVsbG8gV29ybGQ=" is "Hello World" in base64
      expect(result).toBeInstanceOf(ArrayBuffer);
      const decodedString = new TextDecoder().decode(result);
      expect(decodedString).toBe("Hello World");
    } finally {
      // Restore environment
      process.env.API_KEY = originalApiKey;
    }
  });

  test("throws error when no audio data is received", async () => {
    // Set a dummy API key for the test
    const originalApiKey = process.env.API_KEY;
    process.env.API_KEY = "test-api-key";

    try {
      // "trigger_error" is a special text we use to mock an empty response
      expect(generateTTS("trigger_error")).rejects.toThrow("No audio data received");
    } finally {
      // Restore environment
      process.env.API_KEY = originalApiKey;
    }
  });
});
