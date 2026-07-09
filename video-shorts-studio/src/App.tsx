import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { AppTab, SceneScript } from './types';
import Header from './components/Header';
import PhoneSimulator from './components/PhoneSimulator';
import ClipFromYouTube from './components/ClipFromYouTube';
import StudioFromZero from './components/StudioFromZero';
import { AudioEffect } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('clip');
  const [menuOpen, setMenuOpen] = useState(false);

  // Phone simulator state
  const [captions, setCaptions] = useState<string[]>([]);
  const [currentCaptionIndex, setCurrentCaptionIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('Processando...');
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [audioEffect, setAudioEffect] = useState<AudioEffect>('original');

  // Studio active scene for preview sync
  const [activeStudioScene, setActiveStudioScene] = useState(0);
  const [studioScenes, setStudioScenes] = useState<SceneScript[]>([]);

  const handleCaptionsChange = useCallback((newCaptions: string[]) => {
    setCaptions(newCaptions);
    setCurrentCaptionIndex(0);
  }, []);

  const handleProcessingChange = useCallback((processing: boolean, label?: string) => {
    setIsProcessing(processing);
    if (label) setProcessingLabel(label);
  }, []);

  const handleClipComplete = useCallback((segments: any[]) => {
    if (segments.length > 0) {
      setActiveTab('studio');
    }
  }, []);

  const handleStudioComplete = useCallback((scenes: SceneScript[], videoUrl?: string) => {
    setStudioScenes(scenes);
    if (videoUrl) setVideoPreview(videoUrl);
  }, []);

  const handlePreviewUpdate = useCallback((sceneIndex: number) => {
    setActiveStudioScene(sceneIndex);
    if (studioScenes[sceneIndex]) {
      setCurrentCaptionIndex(sceneIndex);
    }
  }, [studioScenes]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50/80 to-emerald-50/30 flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Toast notification area */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass-dark text-white text-xs font-semibold py-2.5 px-5 rounded-xl shadow-2xl flex items-center gap-2.5 border border-slate-700/50"
          >
            <div className="w-4 h-4 rounded-full border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
            <span>{processingLabel}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        menuOpen={menuOpen}
        onMenuToggle={() => setMenuOpen(!menuOpen)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column - Tools */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Tab Indicator */}
            <div className="flex items-center gap-2 mb-1">
              <div className={`h-6 w-1 rounded-full transition-colors ${
                activeTab === 'clip' ? 'bg-red-400' : 'bg-purple-400'
              }`} />
              <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">
                {activeTab === 'clip' ? 'Módulo de Clipping' : 'Estúdio de Geração'}
              </span>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'clip' ? (
                <motion.div
                  key="clip"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  <ClipFromYouTube
                    onClipComplete={handleClipComplete}
                    onCaptionsChange={handleCaptionsChange}
                    onProcessingChange={(p) => handleProcessingChange(p, 'Processando clipe...')}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="studio"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  <StudioFromZero
                    onProjectComplete={handleStudioComplete}
                    onCaptionsChange={handleCaptionsChange}
                    onProcessingChange={(p) => handleProcessingChange(p, 'Gerando vídeo com IA...')}
                    onPreviewUpdate={handlePreviewUpdate}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎬</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clipping</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Cole um link do YouTube e deixe a IA encontrar os melhores momentos para transformar em Shorts virais com corte 9:16 automático.
                </p>
              </div>
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🤖</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Geração IA</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Descreva uma ideia e o Gemini 3.5 Flash + Veo 3.1 criam o roteiro, geram cenas consistentes e montam o vídeo completo.
                </p>
              </div>
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✨</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consistência</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Personagens e cenários consistentes em todas as cenas usando Image-to-Video com referência visual estável.
                </p>
              </div>
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📤</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Publicação</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Exporte seu Short em MP4 ou publique diretamente no YouTube Shorts com autenticação OAuth2 integrada.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Phone Simulator */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="flex flex-col items-center gap-4">
              {/* Section title */}
              <div className="w-full flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Preview do Short
                </span>
                {captions.length > 0 && (
                  <span className="text-[9px] font-mono font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                    {captions.length} legendas
                  </span>
                )}
              </div>

              {/* Phone */}
              <PhoneSimulator
                videoPreview={videoPreview}
                captions={captions}
                currentCaptionIndex={currentCaptionIndex}
                audioEffect={audioEffect}
                isProcessing={isProcessing}
                processingLabel={processingLabel}
              />

              {/* Caption Navigation (if multiple captions) */}
              {captions.length > 1 && !isProcessing && (
                <div className="flex items-center gap-2 w-full max-w-[280px]">
                  <button
                    onClick={() => setCurrentCaptionIndex((i) => Math.max(0, i - 1))}
                    disabled={currentCaptionIndex === 0}
                    className="px-3 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-100/80 rounded-lg border border-slate-200/50 hover:bg-slate-200/60 disabled:opacity-30 transition-all"
                  >
                    Anterior
                  </button>
                  <span className="flex-1 text-center text-[10px] font-mono font-bold text-slate-400">
                    {currentCaptionIndex + 1} / {captions.length}
                  </span>
                  <button
                    onClick={() => setCurrentCaptionIndex((i) => Math.min(captions.length - 1, i + 1))}
                    disabled={currentCaptionIndex === captions.length - 1}
                    className="px-3 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-100/80 rounded-lg border border-slate-200/50 hover:bg-slate-200/60 disabled:opacity-30 transition-all"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[10px] text-slate-400 font-medium">
            © 2026 Shorts Studio — Criado com Google Gemini & Veo
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-slate-400 font-mono">Feito com</span>
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] text-slate-400 font-mono">Agentic Vibe Coding</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
