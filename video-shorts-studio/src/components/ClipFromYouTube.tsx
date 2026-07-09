import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Youtube,
  Download,
  Scissors,
  Sparkles,
  Clock,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Music,
  Loader2,
} from 'lucide-react';
import { ClipJob, ApiClipResponse, AudioEffect } from '@/src/types';

interface ClipFromYouTubeProps {
  onClipComplete?: (segments: any[]) => void;
  onCaptionsChange?: (captions: string[]) => void;
  onProcessingChange?: (processing: boolean) => void;
}

export default function ClipFromYouTube({
  onClipComplete,
  onCaptionsChange,
  onProcessingChange,
}: ClipFromYouTubeProps) {
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [job, setJob] = useState<ClipJob>({
    id: '',
    youtubeUrl: '',
    status: 'idle',
    progress: 0,
  });
  const [audioEffect, setAudioEffect] = useState<AudioEffect>('original');
  const [showAudioOptions, setShowAudioOptions] = useState(false);

  const audioOptions: { value: AudioEffect; label: string; desc: string }[] = [
    { value: 'original', label: 'Áudio Original', desc: 'Mantém o áudio do vídeo fonte' },
    { value: 'trending_upbeat', label: 'Trending Upbeat', desc: 'Música viral energética' },
    { value: 'cinematic', label: 'Cinematic', desc: 'Trilha cinematográfica dramática' },
    { value: 'lofi', label: 'Lo-Fi Beats', desc: 'Batidas relaxantes para estudo' },
    { value: 'edm_drop', label: 'EDM Drop', desc: 'Eletrônico com drop intenso' },
    { value: 'viral_audio', label: 'Viral Audio', desc: 'Áudio viral em alta' },
  ];

  const validateYoutubeUrl = (value: string): boolean => {
    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\/.+/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/.+/,
    ];
    return patterns.some((p) => p.test(value.trim()));
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (value.trim() && !validateYoutubeUrl(value)) {
      setUrlError('Insira uma URL válida do YouTube');
    } else {
      setUrlError('');
    }
  };

  const handleExtractClip = useCallback(async () => {
    if (!url.trim() || !validateYoutubeUrl(url)) {
      setUrlError('Insira uma URL válida do YouTube');
      return;
    }

    const jobId = `clip-${Date.now()}`;
    setJob({
      id: jobId,
      youtubeUrl: url,
      status: 'downloading',
      progress: 10,
    });
    onProcessingChange?.(true);

    try {
      // Step 1: Download & Analyze
      setJob((prev) => ({ ...prev, status: 'downloading', progress: 25 }));
      const clipResponse = await fetch('/api/clip/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtube_url: url.trim(),
          audio_effect: audioEffect,
        }),
      });

      if (!clipResponse.ok) {
        const errData = await clipResponse.json().catch(() => ({}));
        throw new Error(errData.detail || 'Falha ao processar o vídeo');
      }

      const data: ApiClipResponse = await clipResponse.json();

      if (!data.success || !data.segments) {
        throw new Error(data.error || 'Nenhum segmento encontrado');
      }

      // Usar o jobId retornado pelo backend (frontend gera um temporario)
      const backendJobId = data.jobId || jobId;

      // Step 2: Clipping progress
      setJob((prev) => ({
        ...prev,
        id: backendJobId,
        status: 'clipping',
        progress: 60,
        segments: data.segments,
      }));

      // Step 3: Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/clip/status/${backendJobId}`);
          const status = await statusRes.json();

          setJob((prev) => ({
            ...prev,
            progress: status.progress || 60,
            status: status.status === 'done' ? 'done' : 'clipping',
          }));

          if (status.status === 'done') {
            clearInterval(pollInterval);
            setJob((prev) => ({
              ...prev,
              status: 'done',
              progress: 100,
              outputPath: status.outputPath,
            }));
            onProcessingChange?.(false);
            onClipComplete?.(data.segments || []);
            onCaptionsChange?.(
              data.segments.map((s) => s.caption || s.viralHook)
            );
          } else if (status.status === 'error') {
            clearInterval(pollInterval);
            throw new Error(status.error || 'Erro no processamento');
          }
        } catch {
          clearInterval(pollInterval);
          throw new Error('Falha ao verificar status do processamento');
        }
      }, 2000);

      // Safety timeout
      setTimeout(() => clearInterval(pollInterval), 120000);
    } catch (err: any) {
      setJob((prev) => ({
        ...prev,
        status: 'error',
        error: err.message || 'Erro desconhecido',
        progress: 0,
      }));
      onProcessingChange?.(false);
    }
  }, [url, audioEffect, onClipComplete, onCaptionsChange, onProcessingChange]);

  const handleDownload = useCallback(async () => {
    if (!job.outputPath) return;
    window.open(`/api/download/${job.id}`, '_blank');
  }, [job]);

  const handlePublish = useCallback(async () => {
    if (!job.outputPath) return;
    try {
      const res = await fetch('/api/publish/shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: job.id,
          output_path: job.outputPath,
          title: job.title || 'Meu Short',
        }),
      });
      const data = await res.json();
      if (data.auth_url) {
        window.open(data.auth_url, '_blank');
      }
    } catch {
      // Silent fail for OAuth flow
    }
  }, [job]);

  const resetJob = () => {
    setJob({ id: '', youtubeUrl: '', status: 'idle', progress: 0 });
    onProcessingChange?.(false);
  };

  const statusColors: Record<string, string> = {
    downloading: 'text-blue-500',
    analyzing: 'text-amber-500',
    clipping: 'text-emerald-500',
    done: 'text-emerald-600',
    error: 'text-red-500',
  };

  const statusLabels: Record<string, string> = {
    downloading: 'Baixando vídeo...',
    analyzing: 'Analisando com IA...',
    clipping: 'Recortando Short...',
    done: 'Concluído!',
    error: 'Erro',
  };

  return (
    <div className="flex flex-col gap-5">
      {/* URL Input Card */}
      <div className="glass-card-solid rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
            <Youtube className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Clipping do YouTube</h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Extraia os melhores momentos para Shorts virais
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=... ou https://youtu.be/..."
              disabled={job.status !== 'idle' && job.status !== 'error'}
              className={`w-full px-4 py-3 text-xs bg-slate-50 border rounded-xl outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400 ${
                urlError
                  ? 'border-red-300 focus:ring-2 focus:ring-red-200'
                  : 'border-slate-200 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            />
            {urlError && (
              <p className="flex items-center gap-1 text-[10px] text-red-500 mt-1.5 ml-1 font-medium">
                <AlertCircle className="w-3 h-3" />
                {urlError}
              </p>
            )}
          </div>

          <button
            onClick={handleExtractClip}
            disabled={
              !url.trim() || !!urlError || (job.status !== 'idle' && job.status !== 'error')
            }
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm shadow-emerald-200/50"
          >
            {job.status === 'idle' || job.status === 'error' ? (
              <>
                <Scissors className="w-4 h-4" />
                Extrair Short
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            )}
          </button>
        </div>

        {/* Audio Effect Selector */}
        <div className="mt-3 relative">
          <button
            onClick={() => setShowAudioOptions(!showAudioOptions)}
            className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors px-1"
          >
            <Music className="w-3.5 h-3.5" />
            <span>Efeito de áudio: <span className="text-slate-700">{audioOptions.find((a) => a.value === audioEffect)?.label}</span></span>
            <ChevronDown className={`w-3 h-3 transition-transform ${showAudioOptions ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showAudioOptions && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-20 p-2"
              >
                {audioOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setAudioEffect(opt.value);
                      setShowAudioOptions(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                      audioEffect === opt.value
                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-semibold">{opt.label}</span>
                    <span className="block text-[10px] text-slate-400 font-normal">{opt.desc}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress / Status Card */}
      <AnimatePresence>
        {job.status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="glass-card-solid rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold font-mono ${statusColors[job.status]}`}>
                  {statusLabels[job.status]}
                </span>
                {job.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400">
                {job.progress}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${job.progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  job.status === 'error'
                    ? 'bg-red-400'
                    : job.status === 'done'
                    ? 'bg-emerald-400'
                    : 'bg-emerald-500 processing-pulse'
                }`}
              />
            </div>

            {/* Segments Preview */}
            {job.segments && job.segments.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Ganchos virais detectados ({job.segments.length})
                </span>
                {job.segments.map((seg, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100"
                  >
                    <div className="shrink-0 w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-700 leading-relaxed">
                        {seg.viralHook}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-mono font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                          {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          Duração: {(seg.end - seg.start).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error message */}
            {job.status === 'error' && job.error && (
              <div className="mt-3 flex items-start gap-2 bg-red-50 p-3 rounded-xl border border-red-100">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold text-red-700">{job.error}</p>
                  <button
                    onClick={resetJob}
                    className="text-[10px] font-bold text-red-500 hover:text-red-700 underline mt-1"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons on Completion */}
            {job.status === 'done' && (
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={handleDownload}
                  className="flex-1 min-w-[120px] px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download do Short
                </button>
                <button
                  onClick={handlePublish}
                  className="flex-1 min-w-[120px] px-4 py-2.5 bg-white hover:bg-slate-50 text-red-600 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-red-200 hover:border-red-300 shadow-sm"
                >
                  <Youtube className="w-4 h-4" />
                  Publicar Shorts
                </button>
                <button
                  onClick={resetJob}
                  className="px-4 py-2.5 text-slate-500 hover:text-slate-700 text-xs font-semibold rounded-xl transition-all"
                >
                  Novo Clip
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
