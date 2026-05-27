import { expect, test, describe, mock, beforeAll } from 'bun:test';
import { analyzeArtisticStyle, StudioError } from '../geminiService.ts';

// We will mock the @google/genai module
const mockGenerateContent = mock(async () => {
  return { text: '' }; // default empty response
});

mock.module('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
      };
    },
  };
});

describe('analyzeArtisticStyle', () => {
  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'test-key';
  });

  test('throws StudioError when response text is empty', async () => {
    mockGenerateContent.mockImplementationOnce(async () => ({ text: '' }));

    await expect(analyzeArtisticStyle({ image: 'data:image/jpeg;base64,test', description: 'test' }))
      .rejects.toThrow(new StudioError("Style analysis returned no data."));
  });

  test('throws StudioError when parsing invalid JSON', async () => {
    mockGenerateContent.mockImplementationOnce(async () => ({ text: 'invalid json' }));

    await expect(analyzeArtisticStyle({ image: 'data:image/jpeg;base64,test', description: 'test' }))
      .rejects.toThrow(new StudioError("Failed to parse style analysis results.", 'parsing'));
  });
});
