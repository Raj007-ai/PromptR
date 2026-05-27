import { expect, describe, it, mock, beforeEach, afterEach } from 'bun:test';

const mockGenerateContent = mock(async (args?: any) => {
  return { text: '  mocked generated text  ' };
});

mock.module('@google/genai', () => {
  return {
    GoogleGenAI: class {
      models = {
        generateContent: mockGenerateContent,
      };
    },
    Type: {},
    ThinkingLevel: {},
    Modality: {},
  };
});

// Import after mock
import { enhanceKeywords, StudioError } from '../geminiService.ts';

describe('enhanceKeywords', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-key' };
    mockGenerateContent.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should generate enhanced keywords for non-visual prompts', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: '  enhanced non-visual text  ' });
    const result = await enhanceKeywords('test keywords', false);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArgs = (mockGenerateContent.mock.calls[0] as any[])[0];
    expect(callArgs.model).toBe('gemini-3-flash-preview');
    expect(callArgs.contents).toContain('Transform the following user input into architectural prompt phrases');
    expect(callArgs.contents).toContain('test keywords');

    expect(result).toBe('enhanced non-visual text'); // Should be trimmed
  });

  it('should generate enhanced keywords for visual prompts', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: '  enhanced visual text  ' });
    const result = await enhanceKeywords('test visual keywords', true);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const callArgs = (mockGenerateContent.mock.calls[0] as any[])[0];
    expect(callArgs.model).toBe('gemini-3-flash-preview');
    expect(callArgs.contents).toContain('Transform the following user input into a highly detailed, professional-grade image prompt for Midjourney/DALL-E');
    expect(callArgs.contents).toContain('test visual keywords');

    expect(result).toBe('enhanced visual text'); // Should be trimmed
  });

  it('should throw StudioError if generation fails', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API Error'));

    try {
      await enhanceKeywords('error keywords', false);
      expect(true).toBe(false); // Should not reach here
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as any).name).toBe('StudioError');
      expect((error as any).message).toBe('Refinement service failed. Proceeding with original keywords.');
      expect((error as any).type).toBe('generic');
    }
  });

  it('should fallback to original keywords if response text is missing', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: undefined } as any);
    const result = await enhanceKeywords('test missing text', false);
    expect(result).toBe('test missing text');
  });
});
