import { mock } from "bun:test";

mock.module("@google/genai", () => {
  return {
    GoogleGenAI: mock(() => ({
      models: {
        generateContent: mock()
      }
    })),
    Type: {},
    ThinkingLevel: {},
    Modality: {}
  };
});
