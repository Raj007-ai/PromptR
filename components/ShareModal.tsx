import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Icons } from '../constants.tsx';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
  title?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, promptText, title = "Generated Prompt" }) => {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Generate a shareable URL. In a real app, this might save to a DB and return a shortlink.
      // For now, we encode the prompt in the URL hash or just use the current URL.
      // Since it's a local/preview app, we'll just encode it in a query param for demonstration.
      const url = new URL(window.location.href);
      url.searchParams.set('prompt', encodeURIComponent(promptText));
      setShareUrl(url.toString());
      setCopied(false);
    }
  }, [isOpen, promptText]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy link", e);
    }
  };

  const handleExport = (format: string) => {
    let formattedText = promptText;
    let extension = 'txt';
    let mimeType = 'text/plain';

    switch (format) {
      case 'paragraph':
        formattedText = promptText.replace(/\n+/g, ' ').trim();
        break;
      case 'bullets':
        formattedText = promptText.split(/(?<=[.!?])\s+/).filter(s => s.trim()).map(s => `- ${s.trim()}`).join('\n');
        break;
      case 'steps':
        formattedText = promptText.split(/(?<=[.!?])\s+/).filter(s => s.trim()).map((s, i) => `${i + 1}. ${s.trim()}`).join('\n');
        break;
      case 'json':
        formattedText = JSON.stringify({ title, prompt: promptText, generatedAt: new Date().toISOString() }, null, 2);
        extension = 'json';
        mimeType = 'application/json';
        break;
      case 'markdown':
        formattedText = `### ${title}\n\n> ${promptText.replace(/\n/g, '\n> ')}`;
        extension = 'md';
        break;
    }

    const blob = new Blob([formattedText], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_prompt.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[var(--surface-2)] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest">Share & Export</h3>
              <button onClick={onClose} aria-label="Close modal" className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors rounded-full hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none">
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar max-h-[80vh]">
              {/* QR Code Section */}
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-white rounded-2xl">
                  <QRCodeSVG value={shareUrl} size={160} level="M" includeMargin={false} />
                </div>
                <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-widest">Scan to open</p>
              </div>

              {/* Link Section */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest">Shareable Link</label>
                <div className="flex items-center space-x-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={shareUrl} 
                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-xs text-[var(--text-main)] font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <button 
                    onClick={handleCopyLink}
                    className={`p-3 rounded-xl flex items-center justify-center transition-all ${copied ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-[var(--text-main)] border border-white/10 hover:bg-white/10'} focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none`}
                    title="Copy Link"
                    aria-label="Copy link"
                  >
                    {copied ? <Icons.Save className="w-4 h-4" /> : <Icons.Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Export Section */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <label className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest">Export Options</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleExport('paragraph')} className="py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-[var(--text-main)] hover:bg-white/10 transition-all">Paragraph</button>
                  <button onClick={() => handleExport('bullets')} className="py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-[var(--text-main)] hover:bg-white/10 transition-all">Bullet Points</button>
                  <button onClick={() => handleExport('steps')} className="py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-[var(--text-main)] hover:bg-white/10 transition-all">Step-by-Step</button>
                  <button onClick={() => handleExport('json')} className="py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-[var(--text-main)] hover:bg-white/10 transition-all">JSON</button>
                  <button onClick={() => handleExport('markdown')} className="py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-[var(--text-main)] hover:bg-white/10 transition-all col-span-2">Markdown</button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
