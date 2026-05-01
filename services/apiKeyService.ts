
const STORAGE_KEY = 'promptr_gemini_api_key';

export const apiKeyService = {
  getApiKey: (): string | null => {
    // 1. Check localStorage
    const savedKey = localStorage.getItem(STORAGE_KEY);
    if (savedKey) return savedKey;

    // 2. Fallback to Vite env variable (only for local dev, if VITE_ prefix is used)
    // Note: We avoid VITE_ prefix for secrets in production, but it's okay for local dev convenience.
    return (import.meta as any).env?.VITE_GEMINI_API_KEY || null;
  },

  setApiKey: (key: string): void => {
    if (key) {
      localStorage.setItem(STORAGE_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  hasKey: (): boolean => {
    return !!apiKeyService.getApiKey();
  }
};
