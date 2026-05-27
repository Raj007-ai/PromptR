import { describe, expect, it, mock, beforeEach } from "bun:test";
import { editImageWithAI } from "../../services/geminiService";
import { GoogleGenAI } from "@google/genai";

// Mock the generateContent method
const mockGenerateContent = mock(async () => {
  return {
    candidates: [
      {
        content: {
          parts: [
            {
              inlineData: {
                data: "returned_base64_data",
                mimeType: "image/png"
              }
            }
          ]
        }
      }
    ]
  };
});

// Create a mock ai instance
const mockAiInstance = {
  models: {
    generateContent: mockGenerateContent
  }
};

// Mock the GoogleGenAI class constructor
mock.module("@google/genai", () => {
  return {
    GoogleGenAI: class {
      constructor() {
        return mockAiInstance;
      }
    }
  };
});

describe("geminiService", () => {
  describe("editImageWithAI", () => {
    beforeEach(() => {
      mockGenerateContent.mockClear();
    });

    it("should parse mimeType from a data URI correctly (image/png)", async () => {
      const dataUri = "data:image/png;base64,mock_base64_data";
      const instruction = "Test instruction";

      const result = await editImageWithAI(dataUri, instruction);

      expect(result).toBe("data:image/png;base64,returned_base64_data");
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      const callArgs = (mockGenerateContent.mock.calls as any)[0]?.[0];
      expect(callArgs.contents.parts[0].inlineData.mimeType).toBe("image/png");
      expect(callArgs.contents.parts[0].inlineData.data).toBe("mock_base64_data");
    });

    it("should default to image/jpeg if no data URI prefix is provided", async () => {
      const rawBase64 = "raw_base64_data";
      const instruction = "Test instruction";

      const result = await editImageWithAI(rawBase64, instruction);

      expect(result).toBe("data:image/png;base64,returned_base64_data");
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      const callArgs = (mockGenerateContent.mock.calls as any)[0]?.[0];
      expect(callArgs.contents.parts[0].inlineData.mimeType).toBe("image/jpeg");
      expect(callArgs.contents.parts[0].inlineData.data).toBe("raw_base64_data");
    });

    it("should extract correct mimeType from other formats (image/webp)", async () => {
      const dataUri = "data:image/webp;base64,webp_base64_data";
      const instruction = "Test instruction";

      const result = await editImageWithAI(dataUri, instruction);

      expect(result).toBe("data:image/png;base64,returned_base64_data");
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      const callArgs = (mockGenerateContent.mock.calls as any)[0]?.[0];
      expect(callArgs.contents.parts[0].inlineData.mimeType).toBe("image/webp");
      expect(callArgs.contents.parts[0].inlineData.data).toBe("webp_base64_data");
    });

    it("should throw an error if no image is generated in the response", async () => {
      mockGenerateContent.mockImplementationOnce(async () => ({
        candidates: [{ content: { parts: [{ text: "just some text" } as any] } }] as any
      }));

      const dataUri = "data:image/jpeg;base64,data";
      const instruction = "Test instruction";

      let error = null;
      try {
        await editImageWithAI(dataUri, instruction);
      } catch (e: any) {
        error = e;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toBe("No image was generated in the response.");
    });
  });
});
