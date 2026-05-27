import { describe, expect, it, mock, beforeEach, afterEach, spyOn } from 'bun:test';

// Mock the global environment
const originalEnv = process.env;

// Define mock data for tests
const MOCK_OPTIMIZATION_RESULT = {
  optimizedKeywords: "A hyper-realistic, 8k resolution photo of a cyberpunk city",
  recommendedTags: ["cyberpunk", "neon", "rainy", "futuristic", "8k"],
  structureSuggestion: "[Subject] in [Environment] with [Lighting] style [Style]",
  reasoning: "Added more specific and descriptive keywords."
};

const MOCK_AI_RESPONSE = {
  text: JSON.stringify(MOCK_OPTIMIZATION_RESULT)
};

const mockGenerateContent = mock(async () => MOCK_AI_RESPONSE);

// Mock @google/genai module BEFORE importing suggestEnhancements
mock.module('@google/genai', () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      models = {
        generateContent: mockGenerateContent
      };
      constructor() {}
    },
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      ARRAY: 'ARRAY'
    },
    ThinkingLevel: {
      DEFAULT: 'DEFAULT',
      FAST: 'FAST',
      SLOW: 'SLOW',
    },
    Modality: {
      IMAGE: 'IMAGE',
      AUDIO: 'AUDIO',
      TEXT: 'TEXT',
      VIDEO: 'VIDEO'
    }
  };
});

describe('suggestEnhancements', () => {
  let consoleErrorMock: ReturnType<typeof spyOn>;
  let suggestEnhancements: any;

  beforeEach(async () => {
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-api-key' };
    mockGenerateContent.mockClear();
    consoleErrorMock = spyOn(console, 'error').mockImplementation(() => {});

    // Dynamically import to ensure mock.module is applied
    const module = await import('../geminiService');
    suggestEnhancements = module.suggestEnhancements;
  });

  afterEach(() => {
    process.env = originalEnv;
    consoleErrorMock.mockRestore();
  });

  it('should successfully call GoogleGenAI and return parsed optimization result', async () => {
    const result = await suggestEnhancements('cyberpunk city', ['neon']);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const calls = mockGenerateContent.mock.calls as any[];
    const callArgs = calls.length > 0 ? calls[0][0] : undefined;

    // Verify arguments passed to the API
    expect(callArgs?.model).toBe('gemini-3-flash-preview');
    expect(callArgs?.contents[0]).toContain('cyberpunk city');
    expect(callArgs?.contents[0]).toContain('neon');

    // Verify result
    expect(result).toEqual(MOCK_OPTIMIZATION_RESULT);
  });

  it('should include image data in contents if image is provided', async () => {
    const mockImage = 'data:image/jpeg;base64,mockbase64data';
    await suggestEnhancements('test', [], mockImage);

    const calls = mockGenerateContent.mock.calls as any[];
    const callArgs = calls.length > 0 ? calls[0][0] : undefined;
    expect(callArgs?.contents).toHaveLength(3); // text prompt + inlineData + image text prompt
    expect(callArgs?.contents[1].inlineData.data).toBe('mockbase64data');
  });

  it('should handle API errors and throw StudioError', async () => {
    mockGenerateContent.mockImplementationOnce(async () => {
      throw new Error("API Failure");
    });

    await expect(suggestEnhancements('test')).rejects.toThrow('Smart Optimization service failed. Try again soon.');
    expect(consoleErrorMock).toHaveBeenCalled();
  });

  it('should throw Error when response text is empty', async () => {
    mockGenerateContent.mockImplementationOnce(async () => ({ text: '' }));

    await expect(suggestEnhancements('test')).rejects.toThrow('Smart Optimization service failed. Try again soon.');
    expect(consoleErrorMock).toHaveBeenCalled();
  });

  it('should properly strip markdown json formatting from response', async () => {
    const markdownResponse = `\`\`\`json\n${JSON.stringify(MOCK_OPTIMIZATION_RESULT)}\n\`\`\``;
    mockGenerateContent.mockImplementationOnce(async () => ({ text: markdownResponse }));

    const result = await suggestEnhancements('test');
    expect(result).toEqual(MOCK_OPTIMIZATION_RESULT);
  });
});
