import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Film,
  Music,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Youtube,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { UploadedVideo, AudioEffect } from '@/src/types';

interface ConcatStudioProps {
  onConcatComplete?: (captions: string[], videoUrl?: string) => void;
  onProcessingChange?: (processing: boolean) => void;
}

export default function ConcatStudio({
  onConcatComplete,
  onProcessingChange,
}: ConcatStudioProps) {
  const [videos, setVideos] = useState<UploadedVideo[]>([]);
  const [titleText, setTitleText] = useState('');
  const [audioEffect, setAudioEffect] = useState<AudioEffect>('original');
  const [showAudioOptions, setShowAudioOptions] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergeStatus, setMergeStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [mergedJobId, setMergedJobId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const audioOptions: { value: AudioEffect; label: string; desc: string }[] = [
    { value: 'original', label: 'Áudio Original', desc: 'Mantém o áudio do vídeo fonte' },
    { value: 'trending_upbeat', label: 'Trending Upbeat', desc: 'Música viral energética' },
    { value: 'cinematic', label: 'Cinematic', desc: 'Trilha cinematográfica dramática' },
    { value: 'lofi', label: 'Lo-Fi Beats', desc: 'Batidas relaxantes para estudo' },
    { value: 'edm_drop', label: 'EDM Drop', desc: 'Eletrônico com drop intenso' },
    { value: 'viral_audio', label: 'Viral Audio', desc: 'Áudio viral em alta' },
  ];

  const uploadFile = async (file: File) => {
    const tempId = `temp-${Math.random().toString(36).substr(2, 9)}`;
    const newVideo: UploadedVideo = {
      fileId: tempId,
      filename: file.name,
      savedName: '',
      duration: 0,
      fileSize: file.size,
      status: 'uploading',
      progress: 0,
    };

    setVideos((prev) => [...prev, newVideo]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentage = Math.round((e.loaded * 100) / e.total);
          setVideos((prev) =>
            prev.map((v) =>
              v.fileId === tempId ? { ...v, progress: percentage } : v
            )
          );
        }
      });

      const responsePromise = new Promise<any>((resolve, reject) => {
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const resData = JSON.parse(xhr.responseText);
                resolve(resData);
              } catch {
                reject(new Error('Resposta inválida do servidor'));
              }
            } else {
              reject(new Error(`Erro HTTP: ${xhr.status}`));
            }
          }
        };
      });

      xhr.open('POST', '/api/video/upload');
      xhr.send(formData);

      const data = await responsePromise;

      if (data.success) {
        setVideos((prev) =>
          prev.map((v) =>
            v.fileId === tempId
              ? {
                  ...v,
                  status: 'ready',
                  fileId: data.fileId,
                  savedName: data.savedName,
                  duration: data.duration,
                  fileSize: data.fileSize,
                  progress: 100,
                }
              : v
          )
        );
      } else {
        throw new Error(data.error || 'Falha no upload do vídeo');
      }
    } catch (err: any) {
      setVideos((prev) =>
        prev.map((v) =>
          v.fileId === tempId
            ? { ...v, status: 'error', error: err.message || 'Erro no upload' }
            : v
        )
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        uploadFile(file);
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        if (file.type.startsWith('video/')) {
          uploadFile(file);
        }
      });
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setVideos((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index === videos.length - 1) return;
    setVideos((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const removeVideo = (fileId: string) => {
    setVideos((prev) => prev.filter((v) => v.fileId !== fileId));
  };

  const handleMerge = async () => {
    const readyVideos = videos.filter((v) => v.status === 'ready');
    if (readyVideos.length < 2) return;

    setIsMerging(true);
    setMergeStatus('processing');
    setMergeProgress(10);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/video/concat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoFiles: readyVideos.map((v) => v.savedName),
          audioEffect: audioEffect,
          titleText: titleText.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao iniciar processamento de concatenação');
      }

      const data = await response.json();
      if (!data.success || !data.jobId) {
        throw new Error(data.error || 'Falha ao iniciar concatenação');
      }

      const jobId = data.jobId;
      setMergedJobId(jobId);
      onProcessingChange?.(true);

      const interval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/clip/status/${jobId}`);
          if (!statusRes.ok) return;

          const statusData = await statusRes.json();
          setMergeProgress(statusData.progress || 10);

          if (statusData.status === 'done') {
            clearInterval(interval);
            setMergeStatus('done');
            setIsMerging(false);
            onProcessingChange?.(false);
            onConcatComplete?.(
              [titleText.trim() || `Shorts Mesclado: ${readyVideos.length} clipes`],
              `/api/download/${jobId}`
            );
          } else if (statusData.status === 'error') {
            clearInterval(interval);
            setMergeStatus('error');
            setErrorMsg(statusData.error || 'Erro na concatenação');
            setIsMerging(false);
            onProcessingChange?.(false);
          }
        } catch {
          clearInterval(interval);
          setMergeStatus('error');
          setErrorMsg('Falha ao obter status do processamento');
          setIsMerging(false);
          onProcessingChange?.(false);
        }
      }, 2000);

      setTimeout(() => clearInterval(interval), 300000);

    } catch (err: any) {
      setMergeStatus('error');
      setErrorMsg(err.message || 'Ocorreu um erro ao processar os vídeos');
      setIsMerging(false);
      onProcessingChange?.(false);
    }
  };

  const formatSize = (bytes: number) => {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const readyVideos = videos.filter((v) => v.status === 'ready');
  const hasEnoughVideos = readyVideos.length >= 2;

  const handleDownload = () => {
    if (mergedJobId) {
      window.open(`/api/download/${mergedJobId}`, '_blank');
    }
  };

  const handlePublish = async () => {
    if (!mergedJobId) return;
    try {
      const res = await fetch('/api/publish/shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: mergedJobId,
          output_path: `outputs/${mergedJobId}/final.mp4`,
          title: titleText.trim() || 'Shorts Mesclado',
        }),
      });
      const data = await res.json();
      if (data.auth_url) {
        window.open(data.auth_url, '_blank');
      }
    } catch {
      // Fallback
    }
  };

  const resetAll = () => {
    setVideos([]);
    setTitleText('');
    setAudioEffect('original');
    setMergeStatus('idle');
    setMergedJobId(null);
    setErrorMsg(null);
    onProcessingChange?.(false);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Title Header Card */}
      <div className="glass-card-solid rounded-2xl p-5 border border-pink-500/20">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-pink-950/20 flex items-center justify-center border border-pink-500/20">
            <Film className="w-4 h-4 text-pink-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 font-display">Mesclador de Vídeos</h3>
            <p className="text-[10px] text-slate-400 font-medium font-sans">
              Faça upload de seus clipes, ordene como desejar e junte-os em um Short vertical
            </p>
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        {mergeStatus === 'idle' && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-2 ${
              isDragging
                ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.15)]'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/30'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="video/*"
              className="hidden"
            />
            <div className="w-10 h-10 rounded-full bg-slate-850/50 flex items-center justify-center border border-slate-800">
              <Upload className="w-5 h-5 text-pink-400 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200">Arraste seus vídeos aqui</p>
              <p className="text-[10px] text-slate-400 mt-1">ou clique para selecionar do computador</p>
            </div>
          </div>
        )}

        {/* Video Playlist Section */}
        {videos.length > 0 && mergeStatus === 'idle' && (
          <div className="mt-4 flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Lista de Vídeos ({videos.length})
            </span>
            <div className="max-h-[220px] overflow-y-auto pr-1 flex flex-col gap-2">
              {videos.map((vid, idx) => (
                <div
                  key={vid.fileId}
                  className="flex items-center gap-3 bg-slate-900/50 border border-slate-850 p-2.5 rounded-xl text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-pink-950/10 flex items-center justify-center border border-pink-500/10 text-pink-400 text-xs font-mono font-bold select-none">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-200 truncate">{vid.filename}</p>
                    <div className="flex gap-2 text-[9px] text-slate-400 font-medium mt-0.5">
                      <span>{formatSize(vid.fileSize)}</span>
                      <span>•</span>
                      <span>Duração: {formatDuration(vid.duration)}</span>
                    </div>
                  </div>

                  {vid.status === 'uploading' && (
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-pink-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${vid.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono font-bold text-pink-400">{vid.progress || 0}%</span>
                    </div>
                  )}

                  {vid.status === 'error' && (
                    <div className="flex items-center gap-1.5 text-red-400 text-[10px] font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Falhou</span>
                    </div>
                  )}

                  {vid.status === 'ready' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        disabled={idx === videos.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeVideo(vid.fileId)}
                        className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Options Settings */}
        {videos.length > 0 && mergeStatus === 'idle' && (
          <div className="mt-4 flex flex-col gap-3.5 pt-4 border-t border-slate-900">
            {/* Title text input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-violet-400" />
                Título do Short (Overlay Superior)
              </label>
              <input
                type="text"
                value={titleText}
                onChange={(e) => setTitleText(e.target.value)}
                placeholder="Insira um título para fixar no topo do vídeo (opcional)"
                className="w-full px-3 py-2 text-xs bg-slate-900/50 border border-slate-800 rounded-lg outline-none text-slate-100 placeholder:text-slate-500 focus:ring-1 focus:ring-pink-500/30 focus:border-pink-500 transition-all"
              />
            </div>

            {/* Audio settings */}
            <div className="relative">
              <button
                onClick={() => setShowAudioOptions(!showAudioOptions)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold bg-slate-900/50 border border-slate-850 hover:border-slate-800 rounded-xl transition-all cursor-pointer text-slate-200"
              >
                <div className="flex items-center gap-2">
                  <Music className="w-4 h-4 text-pink-400" />
                  <span>
                    Música de Fundo:{' '}
                    <span className="text-pink-300 font-bold">
                      {audioOptions.find((o) => o.value === audioEffect)?.label}
                    </span>
                  </span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    showAudioOptions ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {showAudioOptions && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute z-10 w-full mt-1.5 glass-dark rounded-xl border border-slate-800 shadow-2xl p-1.5 flex flex-col gap-1"
                  >
                    {audioOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setAudioEffect(opt.value);
                          setShowAudioOptions(false);
                        }}
                        className={`w-full flex flex-col p-2 rounded-lg text-left transition-all cursor-pointer ${
                          audioEffect === opt.value
                            ? 'bg-pink-500/10 border border-pink-500/20 text-pink-300'
                            : 'hover:bg-slate-900 border border-transparent text-slate-300'
                        }`}
                      >
                        <span className="text-xs font-bold">{opt.label}</span>
                        <span className="text-[9px] text-slate-400 mt-0.5">{opt.desc}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Merge Trigger Button */}
            <button
              onClick={handleMerge}
              disabled={!hasEnoughVideos || isMerging}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                hasEnoughVideos && !isMerging
                  ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg shadow-pink-500/20 hover:opacity-95 hover:shadow-pink-500/30'
                  : 'bg-slate-900 text-slate-500 border border-slate-850 cursor-not-allowed'
              }`}
            >
              {isMerging ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando Concatenação...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" />
                  <span>Mesclar {readyVideos.length || 0} Vídeos</span>
                </>
              )}
            </button>
            {!hasEnoughVideos && (
              <p className="text-[9px] text-slate-500 text-center font-medium">
                Faça upload de pelo menos 2 vídeos prontos para habilitar a mesclagem.
              </p>
            )}
          </div>
        )}

        {/* Processing Concat Screen */}
        {mergeStatus === 'processing' && (
          <div className="mt-4 flex flex-col items-center justify-center p-6 bg-slate-900/30 border border-slate-900 rounded-xl gap-4 text-center">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-pink-500/20 border-t-pink-400 animate-spin" />
              <Film className="absolute inset-0 m-auto w-5 h-5 text-pink-400 animate-pulse" />
            </div>
            <div className="w-full max-w-[240px]">
              <p className="text-xs font-bold text-slate-200">Criando seu Short...</p>
              <p className="text-[10px] text-slate-400 mt-1">Normalizando formatos e codecs para evitar bugs</p>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 mt-4 overflow-hidden border border-slate-900">
                <div
                  className="bg-gradient-to-r from-pink-500 to-violet-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${mergeProgress}%` }}
                />
              </div>
              <span className="text-[9px] font-mono font-bold text-pink-300 mt-1.5 block">
                Progresso: {mergeProgress}%
              </span>
            </div>
          </div>
        )}

        {/* Done Success Screen */}
        {mergeStatus === 'done' && (
          <div className="mt-4 flex flex-col items-center justify-center p-6 bg-pink-950/5 border border-pink-500/20 rounded-xl gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400 border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Short Mesclado com Sucesso!</p>
              <p className="text-[10px] text-slate-400 mt-1">O clipe final de {readyVideos.length} vídeos está pronto no simulador</p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full max-w-[280px]">
              <button
                onClick={handleDownload}
                className="py-2.5 rounded-xl border border-slate-850 hover:bg-slate-900 text-[10px] font-bold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5 text-pink-400" />
                Baixar Vídeo
              </button>
              <button
                onClick={handlePublish}
                className="py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-[10px] font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-pink-500/10 transition-all"
              >
                <Youtube className="w-3.5 h-3.5" />
                Publicar
              </button>
            </div>

            <button
              onClick={resetAll}
              className="text-[10px] font-bold text-pink-400 hover:text-pink-300 transition-all cursor-pointer mt-1"
            >
              Criar Outra Mesclagem
            </button>
          </div>
        )}

        {/* Error Screen */}
        {mergeStatus === 'error' && (
          <div className="mt-4 flex flex-col items-center justify-center p-6 bg-red-950/5 border border-red-500/20 rounded-xl gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Falha ao Mesclar Vídeos</p>
              <p className="text-[10px] text-red-300 mt-1 max-w-[220px] mx-auto line-clamp-2">
                {errorMsg || 'Verifique seus arquivos e tente novamente.'}
              </p>
            </div>

            <button
              onClick={resetAll}
              className="py-2 px-4 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
