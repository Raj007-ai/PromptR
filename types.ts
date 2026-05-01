
export enum AppView {
  PROMPT_GENERATOR = 'PROMPT_GENERATOR',
  IMAGE_STUDIO = 'IMAGE_STUDIO',
  STYLE_ANALYZER = 'STYLE_ANALYZER'
}

export enum GenerationLanguage {
  ENGLISH = 'English',
  HINDI = 'Hindi',
  HINGLISH = 'Hinglish'
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

export interface ImageGenerationInput {
  prompt: string;
  aspectRatio: AspectRatio;
  style?: string;
  negativePrompt?: string;
  numberOfImages?: number;
}

export interface GeneratedImageResult {
  url: string;
  urls?: string[];
  revisedPrompt: string;
}

export interface PromptInput {
  keywords: string;
  tags: string[];
  language: GenerationLanguage;
  useSearch: boolean;
  useThinking: boolean;
  image?: string;
  targetMedium?: string;
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





export interface StyleAnalysisResult {
  summary: string;
  keywords: string[];
  tags: string[];
  movements: string[];
  techniques: string[];
}
