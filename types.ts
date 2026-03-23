
export enum AppView {
  PROMPT_GENERATOR = 'PROMPT_GENERATOR',
  IMAGE_STUDIO = 'IMAGE_STUDIO',
  SAVED = 'SAVED',
  HISTORY = 'HISTORY',
  BATCH_RESULTS = 'BATCH_RESULTS',
  STYLE_ANALYZER = 'STYLE_ANALYZER'
}

export enum GenerationLanguage {
  ENGLISH = 'English',
  HINDI = 'Hindi',
  HINGLISH = 'Hinglish',
  SPANISH = 'Spanish',
  FRENCH = 'French',
  JAPANESE = 'Japanese'
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9';

export interface ImageGenerationInput {
  prompt: string;
  aspectRatio: AspectRatio;
  style?: string;
  negativePrompt?: string;
}

export interface GeneratedImageResult {
  url: string;
  revisedPrompt: string;
}

export interface PromptInput {
  keywords: string;
  tags: string[];
  language: GenerationLanguage;
  useSearch: boolean;
  useThinking: boolean;
  image?: string;
}

export interface StyleBreakdown {
  movements: string[];
  techniques: string[];
  influences: string[];
}

export interface GeneratedPrompt {
  refinedPrompt: string;
  negativePrompt?: string;
  logic?: string;
  styleAnalysis?: StyleBreakdown | string;
  suggestedSettings?: string;
  references?: Array<{ web: { uri: string; title: string } }>;
  inputContext?: {
    keywords: string;
    tags: string[];
    language: GenerationLanguage;
    useSearch: boolean;
    useThinking: boolean;
  };
}

export interface BatchVariationResult {
  variations: string[];
  themeSynthesis: string;
}

export type SavedItemType = 'prompt' | 'image';

export interface SavedItem {
  id: string;
  type: SavedItemType;
  timestamp: number;
  data: GeneratedPrompt | string | GeneratedImageResult;
  title?: string;
}

export interface StyleAnalysisResult {
  summary: string;
  keywords: string[];
  tags: string[];
  movements: string[];
  techniques: string[];
}
