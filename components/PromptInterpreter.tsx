import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { KEYWORD_EFFECTS, Icons } from '../constants.tsx';

interface PromptInterpreterProps {
  prompt: string;
}

export const PromptInterpreter: React.FC<PromptInterpreterProps> = ({ prompt }) => {
  const detectedKeywords = useMemo(() => {
    if (!prompt) return [];
    const lowerPrompt = prompt.toLowerCase();
    const found: Array<{ keyword: string; effect: string }> = [];
    
    Object.entries(KEYWORD_EFFECTS).forEach(([keyword, effect]) => {
      if (lowerPrompt.includes(keyword)) {
        found.push({ keyword, effect });
      }
    });
    
    return found;
  }, [prompt]);

  if (detectedKeywords.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center space-x-2 text-emerald-400">
        <Icons.Brain className="w-4 h-4" />
        <h4 className="text-[10px] font-black uppercase tracking-widest">Real-Time Model Interpretation</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {detectedKeywords.map((item, index) => (
          <motion.div 
            key={item.keyword}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group"
          >
            <div className="flex items-start space-x-3">
              <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <div>
                <span className="text-[10px] font-bold text-white uppercase tracking-wider block mb-1">
                  {item.keyword}
                </span>
                <span className="text-[11px] font-medium text-white/60 leading-relaxed group-hover:text-white/80 transition-colors">
                  {item.effect}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
