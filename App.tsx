
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppView, GenerationLanguage, PromptInput, GeneratedPrompt, AspectRatio, GeneratedImageResult, StyleAnalysisResult } from './types.ts';
import { Icons, TAG_SUGGESTIONS, LANGUAGE_EXAMPLES } from './constants.tsx';
import { generateAIPrompt, enhanceKeywords, suggestEnhancements, generateAIImage, editImageWithAI, analyzeArtisticStyle, StudioError } from './geminiService.ts';
import { Particles } from './components/Particles.tsx';
import { ShareModal } from './components/ShareModal.tsx';
import { PromptInterpreter } from './components/PromptInterpreter.tsx';
import { UserLogo } from './components/UserLogo.tsx';
import { ThemeToggle } from './components/ThemeToggle.tsx';
import Editor from 'react-simple-code-editor';

const PromptEditor: React.FC<{
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
  onCopy?: () => void;
  containerClassName?: string;
  editorStyle?: React.CSSProperties;
}> = ({ value, onChange, onClear, onCopy, containerClassName = "h-40", editorStyle }) => {
  return (
    <div className="relative group flex flex-col w-full">
      <div className="flex justify-between items-center mb-2 px-2">
        <div className="flex space-x-2">
        </div>
      </div>

      <div className={`relative w-full rounded-3xl bg-white/[0.015] border border-white/5 focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/5 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-md overflow-hidden flex ${containerClassName}`}>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Editor
            value={value}
            onValueChange={onChange}
            highlight={code => code}
            padding={24}
            style={editorStyle || {
              fontFamily: '"Inter", sans-serif',
              fontSize: '1rem',
              fontWeight: 500,
              minHeight: '100%',
              outline: 'none',
            }}
            textareaClassName="outline-none placeholder:text-white/20 selection:bg-emerald-500/30"
            placeholder="Subject, mood, lighting, perspective..."
          />
        </div>
        {value && (
          <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
            {onCopy && (
              <button 
                onClick={onCopy}
                aria-label="Copy to Clipboard"
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none focus-visible:opacity-100"
                title="Copy to Clipboard"
              >
                <Icons.Copy />
              </button>
            )}
            <button 
              onClick={onClear}
              aria-label="Clear Keywords"
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none focus-visible:opacity-100"
              title="Clear Keywords"
            >
              <Icons.X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

type OutputTab = 'prompt' | 'negative' | 'analysis' | 'settings' | 'references';
type ImageOutputTab = 'materialized' | 'synthesis' | 'refine';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

const STYLE_PRESETS = [
  { id: 'cinematic', name: 'Cinematic', description: 'Dramatic lighting, high contrast, movie-like quality' },
  { id: 'surreal', name: 'Surrealism', description: 'Dream-like logic, impossible structures, vibrant colors' },
  { id: 'cyberpunk', name: 'Cyberpunk', description: 'Neon lights, futuristic tech, rainy cityscapes' },
  { id: 'oil-painting', name: 'Oil Painting', description: 'Rich textures, visible brushstrokes, classical feel' },
  { id: 'isometric', name: 'Isometric 3D', description: 'Clean geometry, miniature world, digital art style' },
  { id: 'minimalist', name: 'Minimalist', description: 'Simplicity, high whitespace, focused subjects' },
];

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

let audioCtx: AudioContext | null = null;
const getAudioCtx = () => {
  if (!audioCtx) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    } catch (e) {
      console.warn("AudioContext initialization failed", e);
    }
  }
  return audioCtx;
};

const playSound = (type: 'click' | 'success' | 'ignite' | 'error') => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  
  if (ctx.state === 'suspended') {
    ctx.resume().catch(e => console.warn("Failed to resume audio context", e));
  }
  const now = ctx.currentTime;

  const createOscillator = (freq: number, type: OscillatorType, startTime: number, duration: number, gainValue: number, freqEnd?: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration);
    
    gain.gain.setValueAtTime(gainValue, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  };

  if (type === 'click') {
    // Sharp, clean mechanical click
    createOscillator(800, 'sine', now, 0.05, 0.1, 100);
    createOscillator(1200, 'sine', now, 0.02, 0.05, 2000);
  } else if (type === 'ignite') {
    // Powerful, rising energy
    createOscillator(110, 'sine', now, 0.8, 0.15, 880);
    createOscillator(55, 'triangle', now, 1.2, 0.1, 220);
    
    // Add a noise-like texture for "ignition"
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(5000, now + 0.5);
    
    noiseGain.gain.setValueAtTime(0.05, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.5);
  } else if (type === 'error') {
    // Deep, dissonant digital thud
    createOscillator(150, 'sawtooth', now, 0.4, 0.1, 40);
    createOscillator(155, 'sawtooth', now, 0.4, 0.08, 45);
  } else if (type === 'success') {
    // Harmonic, uplifting chime
    createOscillator(440, 'sine', now, 0.6, 0.1, 880);
    createOscillator(554.37, 'sine', now + 0.05, 0.5, 0.08, 1108.73); // C#
    createOscillator(659.25, 'sine', now + 0.1, 0.4, 0.06, 1318.51); // E
  }
};

const PromptRLogo: React.FC<{ animated?: boolean; className?: string; iconOnly?: boolean }> = ({ animated, className, iconOnly }) => {
  let textSize = "text-4xl";
  if (className?.includes("w-32")) textSize = "text-2xl";
  if (className?.includes("w-64")) textSize = "text-4xl md:text-5xl";
  if (className?.includes("w-80")) textSize = "text-7xl md:text-8xl";

  const customClass = className?.replace(/w-\d+/g, '') || "";

  return (
    <div className={`font-heading font-black tracking-widest flex items-center justify-center ${textSize} ${customClass} ${animated ? 'animate-pulse-neon logo-floating' : ''}`}>
      <span className="text-gradient-flow drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] whitespace-pre">
        {iconOnly ? '✦' : '✦  PromptR  ✦'}
      </span>
    </div>
  );
};

const CodeHighlighter: React.FC<{ content: string }> = ({ content }) => {
  const clean = content.replace(/^```(\w+)?\n?|```$/g, '');

  return (
    <pre className="text-sm font-mono leading-relaxed overflow-x-auto custom-scrollbar p-6 bg-white/[0.02] rounded-3xl border border-white/5 shadow-inner backdrop-blur-md">
      <code>{clean}</code>
    </pre>
  );
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<AppView>(AppView.PROMPT_GENERATOR);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Architecting Reality...');
  const [enhancing, setEnhancing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      const messages = [
        'Architecting Reality...',
        'Synthesizing Pixels...',
        'Consulting the Oracle...',
        'Weaving the Matrix...',
        'Calibrating Flux Capacitors...',
        'Enhancing Resolution...',
        'Applying Artistic DNA...'
      ];
      let i = 0;
      interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);
  const [activeOutputTab, setActiveOutputTab] = useState<OutputTab>('prompt');
  const [activeImageOutputTab, setActiveImageOutputTab] = useState<ImageOutputTab>('materialized');
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharePromptText, setSharePromptText] = useState('');
  const [sharePromptTitle, setSharePromptTitle] = useState('');
  
  // Prompt State
  const [keywords, setKeywords] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [language, setLanguage] = useState<GenerationLanguage>(GenerationLanguage.ENGLISH);
  const [targetMedium, setTargetMedium] = useState('Image Generation');
  const [useSearch, setUseSearch] = useState(true);
  const [useThinking, setUseThinking] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<GeneratedPrompt | null>(null);

  
  // Image Generation State
  const [imagePrompt, setImagePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [negativeImagePrompt, setNegativeImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<GeneratedImageResult | null>(null);
  const [refinementInstruction, setRefinementInstruction] = useState('');
  const [auraRefineInstruction, setAuraRefineInstruction] = useState('');
  const [auraImageRefineInstruction, setAuraImageRefineInstruction] = useState('');


  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingStyle, setIsDraggingStyle] = useState(false);

  const handleFile = (file: File, callback: (data: string) => void) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (re) => callback(re.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      showNotification("Please upload a valid image file.", "error");
    }
  };



  const [styleAnalysisResult, setStyleAnalysisResult] = useState<StyleAnalysisResult | null>(null);
  const [styleAnalysisInput, setStyleAnalysisInput] = useState({ description: '', image: null as string | null });
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);
  const [autoApplyStyle, setAutoApplyStyle] = useState(true);
  const styleAnalysisFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const handleAddTag = (val: string) => {
    const clean = val.trim().toLowerCase();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
      playSound('click');
    }
  };

  const handleGenerate = async (isVariation: boolean = false) => {
    if (!keywords.trim() && !image) {
      showNotification("Provide keywords or an image for architectural context.", "warning");
      playSound('error');
      return;
    }

    setLoading(true);
    playSound('ignite');
    try {
      const result = await generateAIPrompt({ keywords, tags, language, useSearch, useThinking, image: image || undefined, targetMedium }, isVariation);
      setGeneratedResult(result);
      
      if (result.refinedPrompt) {
        // History removed
      }
      
      setActiveOutputTab('prompt');
      showNotification(isVariation ? "Variation synthesized." : "Blueprint synthesized.", "success");
    } catch (err: any) {
      const studioError = err instanceof StudioError ? err : new StudioError("Unexpected system failure.");
      showNotification(studioError.message, "error");
      playSound('error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async (numberOfImages: number = 1) => {
    if (!imagePrompt.trim()) {
      showNotification("Provide a visual description to generate an image.", "warning");
      playSound('error');
      return;
    }

    setLoading(true);
    playSound('ignite');
    try {
      const result = await generateAIImage({
        prompt: imagePrompt,
        aspectRatio,
        style: selectedStyle,
        negativePrompt: negativeImagePrompt,
        numberOfImages
      });
      setGeneratedImage(result);
      
      setActiveImageOutputTab('materialized');
      showNotification("Visual materialized successfully.", "success");
    } catch (err: any) {
      const studioError = err instanceof StudioError ? err : new StudioError("Unexpected visual system failure.");
      showNotification(studioError.message, "error");
      playSound('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefineImage = async () => {
    if (!generatedImage || !refinementInstruction.trim()) {
      showNotification("Provide an instruction to refine the visual.", "warning");
      return;
    }

    setLoading(true);
    playSound('ignite');
    try {
      const result = await editImageWithAI(generatedImage.url, refinementInstruction, aspectRatio);
      setGeneratedImage(result);
      setRefinementInstruction('');
      setActiveImageOutputTab('materialized');
      showNotification("Visual Aura refined successfully.", "success");
    } catch (err: any) {
      showNotification(err.message || "Refinement failed.", "error");
    } finally {
      setLoading(false);
    }
  };



  const handleAnalyzeStyle = async () => {
    if (!styleAnalysisInput.description && !styleAnalysisInput.image) {
      showNotification("Provide an image or description for analysis.", "warning");
      return;
    }

    setIsAnalyzingStyle(true);
    playSound('ignite');
    try {
      const result = await analyzeArtisticStyle({
        image: styleAnalysisInput.image || undefined,
        description: styleAnalysisInput.description || undefined
      });
      setStyleAnalysisResult(result);
      
      if (autoApplyStyle) {
        setKeywords(prev => {
          const newKeywords = result.keywords.join(', ');
          return prev ? `${prev}, ${newKeywords}` : newKeywords;
        });
        setTags(prev => {
          const combined = [...new Set([...prev, ...result.tags])];
          return combined;
        });
        setActiveView(AppView.PROMPT_GENERATOR);
        showNotification("Artistic DNA decoded and applied to Generator.", "success");
      } else {
        showNotification("Artistic DNA decoded successfully.", "success");
      }
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setIsAnalyzingStyle(false);
    }
  };

  const applyStyleAnalysis = () => {
    if (!styleAnalysisResult) return;
    
    // Merge keywords and tags
    setKeywords(prev => {
      const newKeywords = styleAnalysisResult.keywords.join(', ');
      return prev ? `${prev}, ${newKeywords}` : newKeywords;
    });
    
    setTags(prev => {
      const combined = [...new Set([...prev, ...styleAnalysisResult.tags])];
      return combined;
    });
    
    setActiveView(AppView.PROMPT_GENERATOR);
    showNotification("Style insights applied to generator.", "success");
    playSound('success');
  };

  const downloadImage = (dataUrl: string, name: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Downloading visual blueprint...", "info");
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <UserLogo />
      <ThemeToggle />
      
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center space-y-3 w-full max-w-md px-4 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`w-full px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl animate-in fade-in slide-in-from-top-4 border backdrop-blur-3xl transition-all duration-300 pointer-events-auto flex items-center space-x-3 ${
            toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 
            toast.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
            toast.type === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
            'bg-slate-900/40 text-white border-white/10'
          }`}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-400 shadow-[0_0_8px_var(--primary-glow)]' : 
              toast.type === 'error' ? 'bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
              toast.type === 'warning' ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
              'bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]'
            }`} />
            <span className="flex-1">{toast.message}</span>
          </div>
        ))}
      </div>

      <nav className="sticky top-0 z-50 px-4 py-8 flex flex-col items-center space-y-8">
        <div className="absolute inset-0 bg-[var(--bg-deep)]/40 backdrop-blur-2xl border-b border-[var(--border)] -z-10" />
        <PromptRLogo className="w-64" animated />
        <div className="flex glass-panel rounded-2xl p-1.5 shadow-2xl w-full max-w-4xl overflow-x-auto no-scrollbar relative">
          <div className="flex min-w-max w-full relative">
            {(Object.values(AppView) as AppView[])
              .map((view) => (
                <button 
                  key={view} 
                  onClick={() => { setActiveView(view); }} 
                  className={`flex-1 px-6 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all relative z-10 ${activeView === view ? 'text-white' : 'opacity-40 hover:opacity-100 text-[var(--text-main)]'}`}
                >
                  {activeView === view && (
                    <motion.div 
                      layoutId="nav-active"
                      className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl -z-10 shadow-lg shadow-emerald-500/20"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  {view.replace('_', ' ')}
                </button>
              ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12 pb-32">
        <AnimatePresence mode="wait">
          {activeView === AppView.PROMPT_GENERATOR && (
            <motion.div 
              key="prompt-generator"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="grid grid-cols-1 xl:grid-cols-2 gap-12 items-start"
            >
              <div className="space-y-8 glass-panel p-8 rounded-[2.5rem] border-white/5 animate-in fade-in slide-in-from-bottom-4 shadow-[0_32px_64px_rgba(0,0,0,0.3)] flex flex-col">
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-emerald-400/80 uppercase tracking-widest">Narrative Keywords</label>
                    <div className="flex items-center space-x-2">
                      <button onClick={async () => {
                        if (!keywords) return showNotification("Keywords required for auto-suggestion.", "warning");
                        setIsSuggesting(true);
                        try {
                          const { enhancedKeywords, suggestedTags } = await suggestEnhancements(keywords);
                          setKeywords(enhancedKeywords);
                          const newTags = [...new Set([...tags, ...suggestedTags])].slice(0, 15);
                          setTags(newTags);
                          showNotification("Keywords and tags auto-enhanced!", "success");
                        } catch (err: any) {
                          showNotification(err.message, "error");
                        } finally { setIsSuggesting(false); }
                      }} disabled={isSuggesting || !keywords} className="text-[9px] font-black px-4 py-2 rounded-full border border-purple-400/20 text-purple-400 uppercase tracking-widest hover:bg-purple-400/10 transition-all disabled:opacity-30 backdrop-blur-md">
                        {isSuggesting ? 'Suggesting...' : '✨ Auto-Suggest'}
                      </button>
                      <button onClick={async () => {
                        if (!keywords) return showNotification("Keywords required for refinement.", "warning");
                        setEnhancing(true);
                        try { 
                          setKeywords(await enhanceKeywords(keywords, false)); 
                          showNotification("Aura refinement complete."); 
                        } catch (err: any) {
                          showNotification(err.message, "error");
                        } finally { setEnhancing(false); }
                      }} disabled={enhancing || !keywords} className="text-[9px] font-black px-4 py-2 rounded-full border border-cyan-400/20 text-cyan-400 uppercase tracking-widest hover:bg-cyan-400/10 transition-all disabled:opacity-30 backdrop-blur-md">
                        {enhancing ? 'Refining...' : 'Aura Refine'}
                      </button>
                    </div>
                  </div>
                  <PromptEditor
                    value={keywords}
                    onChange={(val) => setKeywords(val)}
                    onClear={() => { setKeywords(''); playSound('click'); }}
                    onCopy={() => {
                      navigator.clipboard.writeText(keywords);
                      showNotification("Keywords copied to clipboard.", "success");
                    }}
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-blue-400/80 uppercase tracking-widest px-2">Technical DNA Tags</label>
                  <div className="flex flex-wrap gap-2 min-h-[44px]">
                    <AnimatePresence>
                      {tags.map(tag => (
                        <motion.span 
                          key={tag}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center space-x-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-400"
                        >
                          <span>{tag}</span>
                          <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-white transition-colors">×</button>
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>
                  <input 
                    type="text" value={tagInput} 
                    onChange={(e) => {
                      if (e.target.value.endsWith(',') || e.target.value.endsWith(' ')) handleAddTag(e.target.value.replace(/[, ]/g, ''));
                      else setTagInput(e.target.value);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag(tagInput)}
                    placeholder="Cinematic, 8k, Unreal Engine, Surreal..." 
                    className="w-full p-5 rounded-2xl bg-white/[0.015] border border-white/5 text-sm font-medium focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] placeholder:text-white/20"
                  />

                  <div className="space-y-4 pt-2">
                    <h5 className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30 px-2">Suggested DNA</h5>
                    <div className="space-y-3">
                      {TAG_SUGGESTIONS.map(group => (
                        <div key={group.category} className="flex flex-wrap gap-1.5">
                          {group.tags.map(tag => (
                            <button
                              key={tag}
                              onClick={() => handleAddTag(tag)}
                              className="px-3 py-1 bg-white/[0.015] border border-white/5 rounded-lg text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-wider hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400 transition-all backdrop-blur-sm"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-2">Reference Image</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()} 
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFile(file, setImage);
                      }}
                      className={`relative h-44 rounded-3xl border-2 border-dashed transition-all cursor-pointer overflow-hidden group backdrop-blur-md ${isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/5 bg-white/[0.015] hover:bg-white/[0.03]'}`}
                    >
                      {image ? (
                        <>
                          <img src={image} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                          <button onClick={(e) => { e.stopPropagation(); setImage(null); }} className="absolute top-2 right-2 p-1.5 bg-red-500/20 rounded-full hover:bg-red-500 transition-all">×</button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full space-y-2 opacity-30 group-hover:opacity-50 transition-opacity">
                          <Icons.Image />
                          <span className="text-[9px] font-black uppercase tracking-widest text-center px-4">Upload Reference Image</span>
                        </div>
                      )}
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onClick={(e) => e.stopPropagation()} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file, setImage);
                        if (e.target) e.target.value = '';
                      }} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-2">Target Medium</label>
                    <div className="flex flex-wrap gap-2">
                      {['Image Generation', 'Video Generation', 'Music/Audio', 'Code/Development', 'Creative Writing', 'General'].map(medium => (
                        <button 
                          key={medium} 
                          onClick={() => setTargetMedium(medium)} 
                          className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${targetMedium === medium ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-black/5 border-white/5 opacity-40 hover:opacity-100 text-[var(--text-main)]'}`}
                        >
                          {medium}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-2">Generation Settings</label>
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setUseSearch(!useSearch)} className={`p-3 rounded-2xl border flex flex-col items-center justify-center space-y-2 transition-all backdrop-blur-md ${useSearch ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-white/[0.015] border-white/5 opacity-40 hover:opacity-100'}`}>
                          <Icons.Search className="w-5 h-5" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-center">Web Grounding</span>
                        </button>
                        <button onClick={() => setUseThinking(!useThinking)} className={`p-3 rounded-2xl border flex flex-col items-center justify-center space-y-2 transition-all backdrop-blur-md ${useThinking ? 'bg-blue-500/10 border-blue-500/40 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'bg-white/[0.015] border-white/5 opacity-40 hover:opacity-100'}`}>
                          <Icons.Brain className="w-5 h-5" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-center">Deep Logic</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(Object.values(GenerationLanguage) as GenerationLanguage[]).map(lang => (
                          <button key={lang} onClick={() => setLanguage(lang)} className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${language === lang ? 'bg-purple-500/10 border-purple-500/40 text-purple-400' : 'bg-black/5 border-white/5 opacity-40 hover:opacity-100 text-[var(--text-main)]'}`}>
                            {lang.substring(0, 3)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 mt-auto">
                  <button onClick={() => handleGenerate(false)} disabled={loading} className="w-full py-5 bg-gradient-to-r from-emerald-500 via-blue-600 to-cyan-500 text-white font-black uppercase tracking-[0.4em] text-[10px] rounded-2xl shadow-[0_20px_50px_rgba(16,185,129,0.2)] hover:shadow-[0_20px_60px_rgba(16,185,129,0.3)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center space-x-3 group relative overflow-hidden">
                    {loading && (
                      <motion.div 
                        className="absolute inset-0 bg-white/20"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10" /> : (
                      <>
                        <Icons.Zap className="w-4 h-4 group-hover:animate-pulse relative z-10" />
                        <span className="relative z-10">Synthesize Architectural Blueprint</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            <div className="glass-panel rounded-[3rem] p-10 min-h-[600px] flex flex-col relative shadow-[0_32px_64px_rgba(0,0,0,0.3)] overflow-hidden">
              {loading && !generatedResult ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/40 backdrop-blur-md">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 180, 360]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full mb-8"
                  />
                  <AnimatePresence mode="wait">
                    <motion.span 
                      key={loadingMessage}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.3 }}
                      className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-400 text-center"
                    >
                      {loadingMessage}
                    </motion.span>
                  </AnimatePresence>
                </div>
              ) : null}
              {generatedResult ? (
                <div className="space-y-10 flex-1 flex flex-col">
                  <div className="flex bg-white/[0.03] rounded-2xl p-1.5 border border-white/5 overflow-x-auto no-scrollbar relative">
                    {(['prompt', 'negative', 'analysis', 'settings', 'references'] as OutputTab[]).map(tab => (
                      <button 
                        key={tab} 
                        onClick={() => setActiveOutputTab(tab)} 
                        className={`flex-1 py-3 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all relative z-10 ${activeOutputTab === tab ? 'text-emerald-400' : 'opacity-30 hover:opacity-100 text-[var(--text-main)]'}`}
                      >
                        {activeOutputTab === tab && (
                          <motion.div layoutId="output-tab-bg" className="absolute inset-0 bg-emerald-500/10 rounded-xl -z-10" />
                        )}
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1">
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={activeOutputTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.3 }}
                        className="h-full"
                      >
                        {activeOutputTab === 'prompt' && (
                          <div className="space-y-4">
                            <PromptEditor
                              value={generatedResult.refinedPrompt}
                              onChange={(val) => setGeneratedResult({ ...generatedResult, refinedPrompt: val })}
                              onClear={() => setGeneratedResult({ ...generatedResult, refinedPrompt: '' })}
                              onCopy={() => {
                                navigator.clipboard.writeText(generatedResult.refinedPrompt);
                                showNotification("Prompt copied to clipboard.", "success");
                              }}
                              containerClassName="max-h-[400px]"
                              editorStyle={{
                                fontFamily: '"Inter", sans-serif',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                minHeight: '200px',
                                outline: 'none',
                              }}
                            />
                            <PromptInterpreter prompt={generatedResult.refinedPrompt} />
                            <div className="flex justify-end">
                              <button 
                                onClick={() => handleGenerate(true)}
                                disabled={loading}
                                className="px-5 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-[9px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/10 transition-all flex items-center space-x-2 backdrop-blur-md"
                              >
                                <Icons.Zap />
                                <span>Generate More</span>
                              </button>
                            </div>
                          </div>
                        )}
                        {activeOutputTab === 'negative' && (
                          <div className="relative w-full rounded-3xl bg-white/[0.015] border border-white/5 focus-within:border-red-500/50 focus-within:ring-4 focus-within:ring-red-500/5 transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-md overflow-hidden flex max-h-[400px]">
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                              <Editor
                                value={generatedResult.negativePrompt || ''}
                                onValueChange={(val) => setGeneratedResult({ ...generatedResult, negativePrompt: val })}
                                highlight={code => code}
                                padding={24}
                                style={{
                                  fontFamily: '"Inter", sans-serif',
                                  fontSize: '0.875rem',
                                  fontWeight: 500,
                                  minHeight: '200px',
                                  outline: 'none',
                                }}
                                textareaClassName="outline-none placeholder:text-white/20 selection:bg-red-500/30"
                                placeholder="No negative constraints defined."
                              />
                            </div>
                          </div>
                        )}
                        {activeOutputTab === 'analysis' && (
                          <div className="space-y-6">
                            <p className="text-sm text-[var(--text-main)] leading-relaxed opacity-80 font-medium">{generatedResult.logic}</p>
                            {generatedResult.styleAnalysis && typeof generatedResult.styleAnalysis !== 'string' && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 backdrop-blur-md">
                                  <h6 className="text-[8px] font-black uppercase text-emerald-400 tracking-tighter mb-2">Movements</h6>
                                  <div className="flex flex-wrap gap-1">
                                    {Array.isArray((generatedResult.styleAnalysis as any).movements) ? 
                                      (generatedResult.styleAnalysis as any).movements.map((m: string) => <span key={m} className="text-[9px] opacity-70">#{m}</span>) : 
                                      <span className="text-[9px] opacity-30">None</span>
                                    }
                                  </div>
                                </div>
                                <div className="p-5 bg-blue-500/5 rounded-2xl border border-blue-500/10 backdrop-blur-md">
                                  <h6 className="text-[8px] font-black uppercase text-blue-400 tracking-tighter mb-2">Techniques</h6>
                                  <div className="flex flex-wrap gap-1">
                                    {Array.isArray((generatedResult.styleAnalysis as any).techniques) ? 
                                      (generatedResult.styleAnalysis as any).techniques.map((t: string) => <span key={t} className="text-[9px] opacity-70">#{t}</span>) : 
                                      <span className="text-[9px] opacity-30">None</span>
                                    }
                                  </div>
                                </div>
                                <div className="p-5 bg-cyan-500/5 rounded-2xl border border-cyan-500/10 backdrop-blur-md">
                                  <h6 className="text-[8px] font-black uppercase text-cyan-400 tracking-tighter mb-2">Influences</h6>
                                  <div className="flex flex-wrap gap-1">
                                    {Array.isArray((generatedResult.styleAnalysis as any).influences) ? 
                                      (generatedResult.styleAnalysis as any).influences.map((i: string) => <span key={i} className="text-[9px] opacity-70">#{i}</span>) : 
                                      <span className="text-[9px] opacity-30">None</span>
                                    }
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {activeOutputTab === 'settings' && <CodeHighlighter content={generatedResult.suggestedSettings || "Standard default settings applied."} />}
                        {activeOutputTab === 'references' && (
                          <div className="space-y-6">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Grounding References</h4>
                            {Array.isArray(generatedResult.references) && generatedResult.references.length > 0 ? (
                              <div className="space-y-4">
                                {generatedResult.references.map((ref: any, idx: number) => (
                                  <a 
                                    key={idx}
                                    href={ref?.web?.uri || ref?.maps?.uri || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-4 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.06] transition-all group"
                                  >
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs font-bold text-[var(--text-main)] group-hover:text-emerald-400 transition-colors">
                                        {ref?.web?.title || ref?.maps?.title || "Reference Source"}
                                      </span>
                                      <Icons.Layout className="w-3 h-3 opacity-30" />
                                    </div>
                                    <p className="text-[9px] text-[var(--text-muted)] truncate mt-1">{ref?.web?.uri || ref?.maps?.uri || "No URI available"}</p>
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <div className="py-20 text-center opacity-20">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em]">No grounding data available</span>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="flex gap-4 pt-8 border-t border-white/5">
                    <button onClick={async () => { 
                      try {
                        await navigator.clipboard.writeText(generatedResult.refinedPrompt); 
                        showNotification("Blueprint buffered.", "success"); 
                      } catch (e) {
                        showNotification("Failed to copy to clipboard.", "error");
                      }
                    }} className="flex-1 py-4 glass-panel rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 text-[var(--text-main)] hover:bg-white/5 transition-all"><Icons.Copy /><span>Buffer</span></button>
                    <button onClick={() => { setSharePromptText(generatedResult.refinedPrompt); setSharePromptTitle(keywords.slice(0, 30) || "Synthesized Context"); setShareModalOpen(true); }} className="flex-1 py-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center justify-center space-x-2 hover:bg-blue-500/20 transition-all"><Icons.Share /><span>Share</span></button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 opacity-20">
                  <PromptRLogo className="w-32 grayscale brightness-200" />
                  <span className="text-[9px] font-black uppercase tracking-[0.3em]">Studio Idle • Awaiting Context</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeView === AppView.IMAGE_STUDIO && (
          <motion.div 
            key="image-studio"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="grid grid-cols-1 xl:grid-cols-2 gap-12 items-start"
          >
            <div className="space-y-10 glass-panel p-10 rounded-[3rem] border-white/5 shadow-[0_32px_64px_rgba(0,0,0,0.3)]">
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[10px] font-black text-emerald-400/80 uppercase tracking-widest">Visual Description 🍌</label>
                  <button onClick={async () => {
                    if (!imagePrompt) return showNotification("Visual description required for refinement.", "warning");
                    setEnhancing(true);
                    try { 
                      const enhanced = await enhanceKeywords(imagePrompt, true);
                      setImagePrompt(enhanced); 
                      showNotification("Visual Aura refinement complete."); 
                    } catch (err: any) {
                      showNotification(err.message, "error");
                    } finally { setEnhancing(false); }
                  }} disabled={enhancing || !imagePrompt} className="text-[9px] font-black px-4 py-2 rounded-full border border-cyan-400/20 text-cyan-400 uppercase tracking-widest hover:bg-cyan-400/10 transition-all disabled:opacity-30 backdrop-blur-md">
                    {enhancing ? 'Refining...' : 'Aura Refine'}
                  </button>
                </div>
                <PromptEditor
                  value={imagePrompt}
                  onChange={setImagePrompt}
                  onClear={() => { setImagePrompt(''); playSound('click'); }}
                  onCopy={() => {
                    navigator.clipboard.writeText(imagePrompt);
                    showNotification("Prompt copied to clipboard.", "success");
                  }}
                  containerClassName="h-32"
                />
              </div>

              <div className="space-y-6">
                <label className="text-[10px] font-black text-blue-400/80 uppercase tracking-widest px-2">Aspect Ratio</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {(['1:1', '3:4', '4:3', '9:16', '16:9'] as AspectRatio[]).map(ratio => (
                    <button 
                      key={ratio} 
                      onClick={() => { 
                        setAspectRatio(ratio); 
                        playSound('click'); 
                      }} 
                      className={`py-3 rounded-xl text-[9px] font-black border transition-all relative overflow-hidden ${aspectRatio === ratio ? 'text-blue-400 border-blue-500/40' : 'bg-white/[0.03] border-white/5 opacity-40 hover:opacity-100'}`}
                    >
                      {aspectRatio === ratio && (
                        <motion.div layoutId="ratio-bg" className="absolute inset-0 bg-blue-500/10 -z-10" />
                      )}
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[10px] font-black text-cyan-400/80 uppercase tracking-widest px-2">Artistic Direction</label>
                <div className="flex overflow-x-auto gap-3 pb-4 snap-x snap-mandatory custom-scrollbar">
                  {STYLE_PRESETS.map(style => (
                    <button 
                      key={style.id} 
                      onClick={() => { setSelectedStyle(style.id === selectedStyle ? '' : style.id); playSound('click'); }}
                      className={`min-w-[160px] snap-start p-4 rounded-2xl border transition-all text-left flex flex-col space-y-1 relative overflow-hidden shrink-0 ${selectedStyle === style.id ? 'border-cyan-500/40' : 'bg-white/[0.03] border-white/5 opacity-40 hover:opacity-100'}`}
                    >
                      {selectedStyle === style.id && (
                        <motion.div layoutId="style-bg" className="absolute inset-0 bg-cyan-500/10 -z-10" />
                      )}
                      <span className={`text-[10px] font-black uppercase tracking-tight ${selectedStyle === style.id ? 'text-cyan-400' : 'text-white'}`}>{style.name}</span>
                      <span className="text-[8px] opacity-60 leading-tight">{style.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-red-400/80 uppercase tracking-widest px-2">Negative Constraints</label>
                <input 
                  type="text" 
                  value={negativeImagePrompt} 
                  onChange={(e) => setNegativeImagePrompt(e.target.value)} 
                  placeholder="Low quality, blurry, deformed hands..." 
                  className="w-full p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs font-medium focus:border-red-500/40 focus:bg-white/[0.05] outline-none transition-all"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => handleGenerateImage(1)} 
                  disabled={loading} 
                  className="flex-[2] py-6 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 text-white font-black uppercase tracking-[0.4em] text-[10px] rounded-3xl shadow-2xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center space-x-3 group relative overflow-hidden"
                >
                  {loading && (
                    <motion.div 
                      className="absolute inset-0 bg-white/20"
                      animate={{ x: ["-100%", "100%"] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10" /> : <span className="relative z-10">Materialize Visual Blueprint</span>}
                </button>
                <button 
                  onClick={() => handleGenerateImage(4)} 
                  disabled={loading} 
                  className="flex-1 py-6 bg-white/5 border border-white/10 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-3xl shadow-2xl hover:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center space-x-3 group relative overflow-hidden"
                >
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10" /> : <span className="relative z-10">4 Variations</span>}
                </button>
              </div>
            </div>

            <div className="glass-panel rounded-[3rem] p-10 min-h-[600px] flex flex-col relative shadow-[0_32px_64px_rgba(0,0,0,0.3)] overflow-hidden">
              {loading && !generatedImage ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/40 backdrop-blur-md">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 180, 360]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full mb-8"
                  />
                  <AnimatePresence mode="wait">
                    <motion.span 
                      key={loadingMessage}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.3 }}
                      className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-400 text-center"
                    >
                      {loadingMessage}
                    </motion.span>
                  </AnimatePresence>
                </div>
              ) : null}
              {generatedImage ? (
                <div className="space-y-8 flex-1 flex flex-col items-center">
                  <div className="flex bg-white/[0.03] rounded-2xl p-1.5 border border-white/5 w-full relative">
                    {(['materialized', 'synthesis', 'refine'] as ImageOutputTab[]).map(tab => (
                      <button 
                        key={tab} 
                        onClick={() => setActiveImageOutputTab(tab)} 
                        className={`flex-1 py-3 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all relative z-10 ${activeImageOutputTab === tab ? 'text-emerald-400' : 'opacity-30 hover:opacity-100 text-[var(--text-main)]'}`}
                      >
                        {activeImageOutputTab === tab && (
                          <motion.div layoutId="image-tab-bg" className="absolute inset-0 bg-emerald-500/10 rounded-xl -z-10" />
                        )}
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 w-full flex flex-col items-center overflow-y-auto no-scrollbar">
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={activeImageOutputTab}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full flex flex-col items-center"
                      >
                        {activeImageOutputTab === 'materialized' && (
                          <div className={`relative group w-full flex-1 ${generatedImage.urls && generatedImage.urls.length > 1 ? 'grid grid-cols-2 gap-4' : 'flex items-center justify-center'}`}>
                            {generatedImage.urls && generatedImage.urls.length > 1 ? (
                              generatedImage.urls.map((url, idx) => (
                                <div key={idx} className="relative group/item w-full flex items-center justify-center">
                                  <img 
                                    src={url} 
                                    className={`rounded-2xl shadow-xl w-full object-cover transition-all duration-700 ${loading ? 'opacity-50 blur-xl scale-95' : 'opacity-100 blur-0 scale-100'}`} 
                                    alt={`Generated AI Blueprint ${idx + 1}`} 
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/item:opacity-100 transition-opacity rounded-2xl flex items-center justify-center space-x-4 backdrop-blur-sm">
                                    <button onClick={() => downloadImage(url, imagePrompt)} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"><Icons.Image /></button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <>
                                <img 
                                  src={generatedImage.url} 
                                  className={`rounded-3xl shadow-2xl max-h-[450px] object-contain transition-all duration-700 ${loading ? 'opacity-50 blur-xl scale-95' : 'opacity-100 blur-0 scale-100'}`} 
                                  alt="Generated AI Blueprint" 
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl flex items-center justify-center space-x-4 backdrop-blur-sm">
                                  <button onClick={() => downloadImage(generatedImage.url, imagePrompt)} className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"><Icons.Image /></button>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {activeImageOutputTab === 'synthesis' && (
                          <div className="w-full space-y-4">
                            <div className="p-6 bg-white/[0.03] rounded-2xl border border-white/5 shadow-inner backdrop-blur-md">
                              <h6 className="text-[8px] font-black uppercase tracking-widest text-blue-400 mb-3">Revised Visual Synthesis</h6>
                              <p className="text-[11px] font-medium leading-relaxed opacity-70 italic">"{generatedImage.revisedPrompt}"</p>
                            </div>
                            <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 backdrop-blur-md">
                              <h6 className="text-[8px] font-black uppercase tracking-widest text-emerald-400 mb-2">Architectural Meta</h6>
                              <div className="flex justify-between text-[9px] opacity-60">
                                <span>Resolution: 1K (Nano)</span>
                                <span>Aspect Ratio: {aspectRatio}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeImageOutputTab === 'refine' && (
                          <div className="w-full space-y-6">
                            <div className="p-6 bg-white/[0.015] rounded-2xl border border-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-md relative group">
                              <h6 className="text-[8px] font-black uppercase tracking-widest text-emerald-400 mb-3">Material Refinement Instructions</h6>
                              <textarea 
                                value={refinementInstruction}
                                onChange={(e) => setRefinementInstruction(e.target.value)}
                                placeholder="Add a subtle lens flare, change the sky to twilight, or introduce a robotic companion..."
                                className="w-full h-32 bg-transparent text-[11px] font-medium leading-relaxed border-none focus:ring-0 resize-none placeholder:text-white/20 outline-none selection:bg-emerald-500/30"
                              />
                              {refinementInstruction && (
                                <button 
                                  onClick={() => { setRefinementInstruction(''); playSound('click'); }}
                                  className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 transition-all opacity-0 group-hover:opacity-100"
                                  title="Clear Instructions"
                                >
                                  <Icons.X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <button 
                              onClick={handleRefineImage}
                              disabled={loading || !refinementInstruction.trim()}
                              className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center justify-center space-x-2 hover:bg-emerald-500/20 transition-all disabled:opacity-20 backdrop-blur-md relative overflow-hidden group"
                            >
                              {loading && (
                                <motion.div 
                                  className="absolute inset-0 bg-emerald-500/20"
                                  animate={{ x: ["-100%", "100%"] }}
                                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                />
                              )}
                              <div className="relative z-10 flex items-center space-x-2">
                                {loading ? <div className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /> : <Icons.Pencil />}
                                <span>{loading ? 'Refining...' : 'Apply Visual Refinement'}</span>
                              </div>
                            </button>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="w-full space-y-4 pt-4 border-t border-white/5">
                    <button 
                      onClick={handleGenerateImage}
                      disabled={loading}
                      className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center justify-center space-x-2 hover:bg-emerald-500/20 transition-all disabled:opacity-20 backdrop-blur-md"
                    >
                      <Icons.Zap />
                      <span>Generate More</span>
                    </button>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => {
                          if (generatedImage.urls && generatedImage.urls.length > 1) {
                            generatedImage.urls.forEach((url, idx) => {
                              setTimeout(() => downloadImage(url, `${imagePrompt}_${idx + 1}`), idx * 500);
                            });
                          } else {
                            downloadImage(generatedImage.url, imagePrompt);
                          }
                        }} 
                        className="flex-1 py-4 glass-panel rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center space-x-2 text-[var(--text-main)] hover:bg-white/5 transition-all"
                      >
                        <Icons.Image />
                        <span>{generatedImage.urls && generatedImage.urls.length > 1 ? 'Download All' : 'Download 4K'}</span>
                      </button>
                      <button 
                        onClick={() => { setSharePromptText(generatedImage.revisedPrompt); setSharePromptTitle(imagePrompt.slice(0, 30) || "Visual Synthesis"); setShareModalOpen(true); }} 
                        className="flex-1 py-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center justify-center space-x-2 hover:bg-blue-500/20 transition-all"
                      >
                        <Icons.Share />
                        <span>Share</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 opacity-20">
                  <div className="w-32 h-32 flex items-center justify-center text-6xl">🍌</div>
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-center max-w-xs">Waiting for prompt to crystallize into visual reality</span>
                </div>
              )}
            </div>
          </motion.div>
        )}





        {activeView === AppView.STYLE_ANALYZER && (
          <motion.div 
            key="style-analyzer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="max-w-6xl mx-auto space-y-12"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-8 mb-10">
              <div className="space-y-1">
                <h2 className="text-3xl font-black text-[var(--text-main)] uppercase tracking-tight">Artistic DNA Analyzer</h2>
                <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-widest">Deconstruct styles from images or descriptions</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8 glass-panel p-8 rounded-[2.5rem] border-white/5 shadow-[0_32px_64px_rgba(0,0,0,0.3)] flex flex-col">
                <div className="space-y-6 flex-1">
                  <div className="flex justify-between items-center px-2">
                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Visual Reference (Optional)</label>
                    {styleAnalysisInput.image && styleAnalysisInput.description && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-purple-400 bg-purple-400/10 px-3 py-1 rounded-full border border-purple-400/20">
                        ✨ Nuanced Analysis Active
                      </span>
                    )}
                  </div>
                  
                  {!styleAnalysisInput.image ? (
                    <div 
                      onClick={() => styleAnalysisFileRef.current?.click()} 
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingStyle(true); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingStyle(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingStyle(false); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingStyle(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleFile(file, (data) => setStyleAnalysisInput(prev => ({ ...prev, image: data })));
                      }}
                      className={`relative h-40 rounded-[2.5rem] border-2 border-dashed transition-all cursor-pointer overflow-hidden group flex flex-col items-center justify-center ${isDraggingStyle ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'}`}
                    >
                      <div className="flex flex-col items-center space-y-4 opacity-30 group-hover:opacity-60 transition-opacity">
                        <Icons.Image />
                        <span className="text-[10px] font-black uppercase tracking-widest">Click or Drop Image</span>
                      </div>
                      <input 
                        type="file" 
                        ref={styleAnalysisFileRef} 
                        className="hidden" 
                        accept="image/*" 
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFile(file, (data) => setStyleAnalysisInput(prev => ({ ...prev, image: data })));
                          if (e.target) e.target.value = '';
                        }} 
                      />
                    </div>
                  ) : (
                    <div className="relative h-40 rounded-[2.5rem] overflow-hidden border border-white/10 group shadow-2xl">
                      <img src={styleAnalysisInput.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      <button 
                        onClick={(e) => { e.stopPropagation(); setStyleAnalysisInput(prev => ({ ...prev, image: null })); }} 
                        className="absolute top-4 right-4 p-3 bg-red-500/90 rounded-full hover:bg-red-500 hover:scale-110 transition-all z-10 text-white opacity-0 group-hover:opacity-100 translate-y-[-10px] group-hover:translate-y-0 shadow-lg"
                      >
                        <Icons.X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest px-2">Style Description (Optional)</label>
                    <div className="relative group">
                      <textarea 
                        value={styleAnalysisInput.description}
                        onChange={(e) => setStyleAnalysisInput(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe the aesthetic, mood, or artistic style you want to analyze..."
                        className="w-full h-32 rounded-3xl p-6 text-base font-medium bg-white/[0.015] border border-white/5 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all resize-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-md custom-scrollbar outline-none placeholder:text-white/20 selection:bg-blue-500/30"
                      />
                      {styleAnalysisInput.description && (
                        <button 
                          onClick={() => { setStyleAnalysisInput(prev => ({ ...prev, description: '' })); playSound('click'); }}
                          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 transition-all opacity-0 group-hover:opacity-100"
                          title="Clear Description"
                        >
                          <Icons.X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-auto space-y-4">
                  <label className="flex items-center space-x-3 cursor-pointer group px-2">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        checked={autoApplyStyle}
                        onChange={(e) => setAutoApplyStyle(e.target.checked)}
                        className="peer appearance-none w-5 h-5 rounded-md border border-white/20 checked:bg-emerald-500 checked:border-emerald-500 transition-all cursor-pointer"
                      />
                      <Icons.Check className="w-3 h-3 text-slate-950 absolute opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">
                      Auto-apply extracted keywords and tags to Prompt Generator
                    </span>
                  </label>

                  <button 
                    onClick={handleAnalyzeStyle}
                    disabled={isAnalyzingStyle || (!styleAnalysisInput.image && !styleAnalysisInput.description)}
                    className={`w-full py-6 bg-gradient-to-r from-emerald-500 to-blue-600 text-slate-950 font-black uppercase tracking-[0.4em] text-[10px] rounded-3xl shadow-2xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center space-x-3 ${(!isAnalyzingStyle && (styleAnalysisInput.image || styleAnalysisInput.description)) ? 'hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] animate-pulse hover:animate-none' : ''}`}
                  >
                    {isAnalyzingStyle ? <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /> : <span>Decode Artistic DNA</span>}
                  </button>
                </div>
              </div>

              <div className="glass-panel rounded-[3rem] p-10 min-h-[600px] flex flex-col relative shadow-[0_32px_64px_rgba(0,0,0,0.3)] overflow-hidden">
                {styleAnalysisResult ? (
                  <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Style Synthesis</h4>
                      <p className="text-sm font-medium leading-relaxed opacity-80 italic">"{styleAnalysisResult.summary}"</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Movements</h4>
                        <div className="flex flex-wrap gap-2">
                          {styleAnalysisResult.movements.map(m => (
                            <span key={m} className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[9px] font-bold text-blue-400 uppercase">{m}</span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Techniques</h4>
                        <div className="flex flex-wrap gap-2">
                          {styleAnalysisResult.techniques.map(t => (
                            <span key={t} className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-[9px] font-bold text-cyan-400 uppercase">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-400">Extracted DNA Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {styleAnalysisResult.tags.map(tag => (
                          <span key={tag} className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[9px] font-black text-purple-400 uppercase tracking-widest">{tag}</span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Narrative Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {styleAnalysisResult.keywords.map(kw => (
                          <span key={kw} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[9px] font-black text-emerald-400 uppercase tracking-widest">{kw}</span>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={applyStyleAnalysis}
                      className="w-full py-5 bg-emerald-500 text-slate-950 font-black uppercase tracking-[0.3em] text-[9px] rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center space-x-3"
                    >
                      <Icons.Prompt />
                      <span>Apply Insights to Generator</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-6 opacity-20">
                    <div className="w-20 h-20 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center">
                      <Icons.Brain />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em]">Awaiting Input</p>
                      <p className="text-[8px] font-bold uppercase tracking-widest">Upload or describe to begin deconstruction</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Floating Batch Synthesizer Action Bar removed */}
      <AnimatePresence>
      </AnimatePresence>

      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center space-y-12"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                filter: ["blur(0px)", "blur(2px)", "blur(0px)"]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <PromptRLogo className="w-80" animated iconOnly />
            </motion.div>
            <div className="flex flex-col items-center space-y-4">
              <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden relative">
                <motion.div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-blue-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]" 
                  animate={{ left: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  style={{ width: '40%' }} 
                />
              </div>
              <AnimatePresence mode="wait">
                <motion.span 
                  key={loadingMessage}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3 }}
                  className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-400 text-center"
                >
                  {loadingMessage}
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <ShareModal 
        isOpen={shareModalOpen} 
        onClose={() => setShareModalOpen(false)} 
        promptText={sharePromptText} 
        title={sharePromptTitle} 
      />
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default App;
