import { test, expect, mock, describe, beforeEach } from "bun:test";

const mockGenerateContent = mock();

mock.module("@google/genai", () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: mockGenerateContent
      };
      constructor(config: any) {}
    },
    Modality: { AUDIO: "AUDIO" }
  };
});

import { editImageWithAI } from "../services/geminiService";

describe("editImageWithAI", () => {
  beforeEach(() => {
    mockGenerateContent.mockClear();
    process.env.API_KEY = "test_key";
  });

  test("should successfully edit image and return base64 string", async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: { data: "mocked_edited_image_base64" }
              }
            ]
          }
        }
      ]
    });

    const result = await editImageWithAI("data:image/jpeg;base64,original_image_base64", "make it brighter");

    expect(result).toBe("data:image/png;base64,mocked_edited_image_base64");
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: "original_image_base64",
              mimeType: 'image/jpeg'
            }
          },
          { text: "make it brighter" }
        ]
      }
    });
  });

  test("should throw an error if no image is generated in the response", async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              { text: "no image here" }
            ]
          }
        }
      ]
    });

    await expect(editImageWithAI("data:image/jpeg;base64,original_image_base64", "make it brighter"))
      .rejects.toThrow("No image was generated in the response.");
  });

  test("should throw an error if candidates is empty", async () => {
    mockGenerateContent.mockResolvedValue({});

    await expect(editImageWithAI("data:image/jpeg;base64,original_image_base64", "make it brighter"))
      .rejects.toThrow("No image was generated in the response.");
  });
});
