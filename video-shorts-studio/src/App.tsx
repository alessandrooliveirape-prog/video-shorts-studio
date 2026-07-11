import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { AppTab, SceneScript } from './types';
import Header from './components/Header';
import PhoneSimulator from './components/PhoneSimulator';
import ClipFromYouTube from './components/ClipFromYouTube';
import StudioFromZero from './components/StudioFromZero';
import ConcatStudio from './components/ConcatStudio';
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

  const handleConcatComplete = useCallback((titleCaptions: string[], videoUrl?: string) => {
    setCaptions(titleCaptions);
    setCurrentCaptionIndex(0);
    if (videoUrl) setVideoPreview(videoUrl);
  }, []);

  const handlePreviewUpdate = useCallback((sceneIndex: number) => {
    setActiveStudioScene(sceneIndex);
    if (studioScenes[sceneIndex]) {
      setCurrentCaptionIndex(sceneIndex);
    }
  }, [studioScenes]);

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.15),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(236,72,153,0.15),transparent_50%)] flex flex-col font-sans text-slate-100 antialiased selection:bg-violet-500 selection:text-white">
      {/* Toast notification area */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 glass-dark text-white text-xs font-semibold py-2.5 px-5 rounded-xl shadow-2xl flex items-center gap-2.5 border border-violet-500/30"
          >
            <div className="w-4 h-4 rounded-full border-2 border-violet-400/30 border-t-violet-400 animate-spin" />
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
              <div className={`h-6 w-1 rounded-full transition-all ${
                activeTab === 'clip' ? 'bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]' : 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]'
              }`} />
              <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">
                {activeTab === 'clip' ? 'Módulo de Clipping' : activeTab === 'studio' ? 'Estúdio de Geração' : 'Mesclador de Vídeos'}
              </span>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'clip' && (
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
                    onProcessingChange={(p) => handleProcessingChange(p, 'Processando clipe com IA...')}
                  />
                </motion.div>
              )}
              {activeTab === 'studio' && (
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
                    onProcessingChange={(p) => handleProcessingChange(p, 'Gerando vídeo do zero...')}
                    onPreviewUpdate={handlePreviewUpdate}
                  />
                </motion.div>
              )}
              {activeTab === 'concat' && (
                <motion.div
                  key="concat"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  <ConcatStudio
                    onConcatComplete={handleConcatComplete}
                    onProcessingChange={(p) => handleProcessingChange(p, 'Mesclando seus vídeos...')}
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
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Cole um link do YouTube e deixe o Gemini encontrar os melhores momentos e recortar automaticamente para 9:16 com filtros de polimento.
                </p>
              </div>
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🤖</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Geração IA</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Descreva uma ideia e o Gemini 3.5 Flash cria o roteiro, busca B-rolls dinâmicos em alta resolução e narra com voz ultra realista.
                </p>
              </div>
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✨</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Anti-Reuso</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Filtros automáticos de vinheta, ruído analógico e white flash glow aplicados via FFmpeg para mudar a assinatura digital do vídeo.
                </p>
              </div>
              <div className="glass-card rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📤</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Publicação</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Exporte seu Short editado em alta definição ou envie diretamente para o YouTube Shorts com autenticação OAuth integrada.
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
                  <span className="text-[9px] font-mono font-bold text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20 shadow-[0_0_8px_rgba(139,92,246,0.1)]">
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
                    className="px-3 py-1.5 text-[10px] font-bold text-slate-300 bg-slate-900/60 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer"
                  >
                    Anterior
                  </button>
                  <span className="flex-1 text-center text-[10px] font-mono font-bold text-slate-400">
                    {currentCaptionIndex + 1} / {captions.length}
                  </span>
                  <button
                    onClick={() => setCurrentCaptionIndex((i) => Math.min(captions.length - 1, i + 1))}
                    disabled={currentCaptionIndex === captions.length - 1}
                    className="px-3 py-1.5 text-[10px] font-bold text-slate-300 bg-slate-900/60 rounded-lg border border-slate-800 hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer"
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
      <footer className="border-t border-slate-900 bg-slate-950/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[10px] text-slate-500 font-medium">
            © 2026 Shorts Studio — Criado com Google Gemini & FFmpeg
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-slate-500 font-mono">Feito com</span>
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span className="text-[9px] text-slate-500 font-mono">Agentic Vibe Coding</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
