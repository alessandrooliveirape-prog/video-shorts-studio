import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Volume2 } from 'lucide-react';

interface PhoneSimulatorProps {
  videoPreview?: string | null;
  captions?: string[];
  currentCaptionIndex?: number;
  audioEffect?: string;
  isProcessing?: boolean;
  processingLabel?: string;
}

export default function PhoneSimulator({
  videoPreview,
  captions = [],
  currentCaptionIndex = 0,
  audioEffect = 'original',
  isProcessing = false,
  processingLabel = 'Processando...',
}: PhoneSimulatorProps) {
  const hasContent = videoPreview || captions.length > 0 || isProcessing;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Phone Frame */}
      <div className="phone-frame relative bg-slate-950 overflow-hidden w-full max-w-[280px] mx-auto border border-violet-500/20 shadow-[0_0_40px_rgba(139,92,246,0.15)]">
        {/* Dynamic notch / Dynamic Island */}
        <div className="phone-notch bg-slate-900 border-b border-slate-800">
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_6px_rgba(139,92,246,0.6)]" />
        </div>

        {/* Internal camera dot */}
        <div className="absolute top-3 right-8 w-1.5 h-1.5 rounded-full bg-slate-800 z-10" />

        {/* Status bar */}
        <div className="absolute top-3 left-6 z-10 flex items-center gap-1">
          <span className="text-[10px] font-bold text-white/90 font-mono">9:41</span>
        </div>
        <div className="absolute top-3 right-6 z-10 flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <div className="w-3 h-2 rounded-[1px] border border-white/60 relative">
              <div className="absolute inset-0.5 right-0.5 bg-white/80 rounded-[0.5px]" style={{ width: '70%' }} />
            </div>
          </div>
          <svg className="w-3 h-3 text-white/70" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
          </svg>
        </div>

        {/* Content Area */}
        <div className="absolute inset-0 top-[28px] bottom-[28px] flex flex-col">
          {!hasContent ? (
            /* Empty state - gradient background */
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 gap-3 px-6">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                <Sparkles className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-xs text-slate-400 text-center font-medium leading-relaxed">
                Seu vídeo aparecerá aqui
              </p>
              <p className="text-[10px] text-slate-500 text-center font-normal leading-relaxed max-w-[180px]">
                Cole um link do YouTube, descreva uma ideia ou envie seus vídeos para começar
              </p>
            </div>
          ) : isProcessing ? (
            /* Processing state */
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 gap-4 px-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 border-t-violet-400 animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-violet-400 animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-200 mb-1">{processingLabel}</p>
                <div className="flex gap-1 justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          ) : (
            /* Video / Preview area */
            <div className="flex-1 relative bg-slate-950">
              {videoPreview ? (
                <video
                  src={videoPreview}
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950" />
              )}

              {/* Gradient overlay at bottom for caption readability */}
              <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent" />

              {/* Captions overlay */}
              {captions.length > 0 && (
                <div className="absolute bottom-6 left-4 right-4 z-10">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentCaptionIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.25 }}
                      className="text-center"
                    >
                      <span className="inline-block bg-black/75 backdrop-blur-sm px-4 py-2 rounded-xl text-yellow-300 text-xs font-bold leading-relaxed shadow-xl max-w-[90%] mx-auto border border-violet-500/20 uppercase tracking-wide">
                        {captions[currentCaptionIndex]}
                      </span>
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}

              {/* Audio effect badge */}
              {audioEffect !== 'original' && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-950/80 backdrop-blur-sm px-2 py-1 rounded-full border border-violet-500/20 shadow-[0_0_10px_rgba(236,72,153,0.2)]">
                  <Volume2 className="w-3 h-3 text-fuchsia-400" />
                  <span className="text-[9px] font-bold text-slate-200 font-mono uppercase tracking-wider">
                    {audioEffect.replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Home indicator */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 rounded-full bg-white/20 z-10" />
      </div>

      {/* Caption progress indicator */}
      {captions.length > 1 && (
        <div className="flex gap-1.5 items-center">
          {captions.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === currentCaptionIndex
                  ? 'w-6 bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.6)]'
                  : idx < currentCaptionIndex
                  ? 'w-2 bg-violet-400/40'
                  : 'w-2 bg-slate-800'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
