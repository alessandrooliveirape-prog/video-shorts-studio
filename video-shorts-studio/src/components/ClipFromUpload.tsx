import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  Download,
  Scissors,
  Sparkles,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  XCircle,
  FileVideo,
} from 'lucide-react';
import { ClipSegment, UploadClipJob } from '@/src/types';

interface ClipFromUploadProps {
  onClipComplete?: (segments: any[]) => void;
  onCaptionsChange?: (captions: string[]) => void;
  onProcessingChange?: (processing: boolean) => void;
  onVideoPreview?: (url: string | null) => void;
}

export default function ClipFromUpload({
  onClipComplete,
  onCaptionsChange,
  onProcessingChange,
  onVideoPreview,
}: ClipFromUploadProps) {
  const [job, setJob] = useState<UploadClipJob>({
    id: '',
    filename: '',
    status: 'idle',
    progress: 0,
  });
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const handleFileSelect = useCallback(async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
      setJob((prev) => ({ ...prev, status: 'error', error: 'Formato não suportado. Use MP4, MOV, AVI, MKV ou WebM.' }));
      return;
    }

    // Create local object URL for phone preview
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    onVideoPreview?.(objectUrl);

    const jobId = `upload-clip-${Date.now()}`;
    setJob({
      id: jobId,
      filename: file.name,
      status: 'uploading',
      progress: 10,
    });
    onProcessingChange?.(true);

    try {
      // Step 1: Upload file
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/video/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Falha ao fazer upload');
      const uploadData = await uploadRes.json();
      if (!uploadData.success) throw new Error(uploadData.error || 'Upload falhou');

      const savedName: string = uploadData.savedName;
      setJob((prev) => ({ ...prev, progress: 25 }));

      // Step 2: Analyze with AI
      setJob((prev) => ({ ...prev, status: 'analyzing', progress: 30 }));

      const controller = new AbortController();
      cancelRef.current = () => controller.abort();
      const fetchTimeout = setTimeout(() => controller.abort(), 300000);

      const clipRes = await fetch('/api/clip/from-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saved_name: savedName }),
        signal: controller.signal,
      });

      clearTimeout(fetchTimeout);
      cancelRef.current = null;

      if (!clipRes.ok) {
        const errData = await clipRes.json().catch(() => ({}));
        throw new Error(errData.detail || 'Falha ao analisar vídeo');
      }

      const data = await clipRes.json();
      if (!data.success || !data.segments) {
        throw new Error(data.error || 'Nenhum segmento encontrado');
      }

      // Show first segment caption on the phone preview
      const firstCaption = data.segments[0]?.caption || data.segments[0]?.viralHook;
      if (firstCaption) {
        onCaptionsChange?.(data.segments.map((s: ClipSegment) => s.caption || s.viralHook));
      }

      const backendJobId = data.jobId || jobId;

      setJob((prev) => ({
        ...prev,
        id: backendJobId,
        status: 'clipping',
        progress: 60,
        segments: data.segments,
      }));

      // Step 3: Poll for completion
      const pollInterval = setInterval(async () => {
        pollRef.current = pollInterval;
        try {
          const statusRes = await fetch(`/api/clip/status/${backendJobId}`);
          const status = await statusRes.json();

          if (status.status === 'done') {
            clearInterval(pollInterval);
            pollRef.current = null;
            setJob((prev) => ({
              ...prev,
              status: 'done',
              progress: 100,
              outputPath: status.outputPath,
            }));
            onProcessingChange?.(false);
            onClipComplete?.(data.segments || []);
            onCaptionsChange?.(data.segments.map((s: ClipSegment) => s.caption || s.viralHook));
          } else if (status.status === 'error') {
            clearInterval(pollInterval);
            pollRef.current = null;
            throw new Error(status.error || 'Erro no processamento');
          } else {
            setJob((prev) => ({ ...prev, progress: status.progress || 60 }));
          }
        } catch {
          clearInterval(pollInterval);
          pollRef.current = null;
          throw new Error('Falha ao verificar status');
        }
      }, 2000);
      pollRef.current = pollInterval;

      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 300000);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        cancelRef.current = null;
        return;
      }
      setJob((prev) => ({
        ...prev,
        status: 'error',
        error: err.message || 'Erro desconhecido',
        progress: 0,
      }));
      onProcessingChange?.(false);
    }
  }, [onClipComplete, onCaptionsChange, onProcessingChange]);

  const handleCancel = useCallback(async () => {
    if (cancelRef.current) {
      cancelRef.current();
      cancelRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (job.id) {
      try { await fetch(`/api/clip/cancel/${job.id}`, { method: 'POST' }); } catch { /* ignore */ }
    }
    setJob((prev) => ({ ...prev, status: 'error', error: 'Processamento cancelado.', progress: 0 }));
    onProcessingChange?.(false);
  }, [job.id, onProcessingChange]);

  const handleDownload = useCallback(() => {
    if (job.outputPath) window.open(`/api/download/${job.id}`, '_blank');
  }, [job]);

  const resetJob = () => {
    if (cancelRef.current) { cancelRef.current = null; }
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    onVideoPreview?.(null);
    setJob({ id: '', filename: '', status: 'idle', progress: 0 });
    onProcessingChange?.(false);
  };

  const statusColors: Record<string, string> = {
    uploading: 'text-violet-400', analyzing: 'text-fuchsia-400',
    clipping: 'text-pink-400', done: 'text-violet-400', error: 'text-red-400',
  };
  const statusLabels: Record<string, string> = {
    uploading: 'Enviando vídeo...', analyzing: 'Analisando com Gemini IA...',
    clipping: 'Aplicando edições FFmpeg...', done: 'Concluído!', error: 'Erro',
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Upload Card */}
      <div className="glass-card-solid rounded-2xl p-5 border border-violet-500/20">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-950/20 flex items-center justify-center border border-emerald-500/20">
            <FileVideo className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Upload & Cortar</h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Envie um vídeo baixado do YouTube e a IA seleciona os melhores trechos
            </p>
          </div>
        </div>

        {/* Drop Zone */}
        {(job.status === 'idle' || job.status === 'error') && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-emerald-500 bg-emerald-500/5'
                : 'border-slate-700 hover:border-slate-500 bg-slate-900/30'
            }`}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-slate-500" />
            <p className="text-xs font-bold text-slate-300 mb-1">
              Arraste o vídeo aqui ou clique para selecionar
            </p>
            <p className="text-[9px] text-slate-500">MP4, MOV, AVI, MKV — Máx 500MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.mov,.avi,.mkv,.webm"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />
          </div>
        )}

        {/* Error with retry */}
        {job.status === 'error' && job.error && (
          <div className="mt-3 flex items-start gap-2 bg-red-950/20 p-3 rounded-xl border border-red-900/40">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-red-300">{job.error}</p>
              <button onClick={resetJob} className="text-[10px] font-bold text-red-400 hover:text-red-300 underline mt-1 cursor-pointer">
                Tentar novamente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Progress Card */}
      <AnimatePresence>
        {(job.status !== 'idle') && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="glass-card-solid rounded-2xl p-5 border border-violet-500/20"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold font-mono ${statusColors[job.status]}`}>
                  {statusLabels[job.status]}
                </span>
                {job.status === 'done' && <CheckCircle2 className="w-4 h-4 text-violet-400" />}
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-400">{job.progress}%</span>
            </div>

            <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${job.progress}%` }}
                transition={{ duration: 0.5 }}
                className={`h-full rounded-full ${
                  job.status === 'error' ? 'bg-red-500'
                  : job.status === 'done' ? 'bg-violet-500'
                  : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 processing-pulse'
                }`}
              />
            </div>

            {/* Filename */}
            {job.filename && (
              <div className="mt-3 flex items-center gap-1.5 text-[9px] text-slate-500">
                <FileVideo className="w-3 h-3" />
                <span className="truncate">{job.filename}</span>
              </div>
            )}

            {/* Segments Preview */}
            {job.segments && job.segments.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Trechos detectados ({job.segments.length})
                </span>
                {job.segments.map((seg, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/80">
                    <div className="shrink-0 w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                      <Sparkles className="w-3 h-3 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-slate-200">{seg.viralHook}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-mono font-medium text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/50">
                          <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                          {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          {(seg.end - seg.start).toFixed(1)}s
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cancel */}
            {(job.status === 'uploading' || job.status === 'analyzing' || job.status === 'clipping') && (
              <div className="mt-3 flex items-center justify-center">
                <button onClick={handleCancel}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800/80 hover:bg-red-900/40 text-slate-400 hover:text-red-300 text-[10px] font-bold rounded-xl border border-slate-700 hover:border-red-800/50 transition-all cursor-pointer active:scale-[0.97]"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancelar
                </button>
              </div>
            )}

            {/* Done */}
            {job.status === 'done' && (
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800/80">
                <button onClick={handleDownload}
                  className="flex-1 min-w-[120px] px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download do Short
                </button>
                <button onClick={resetJob}
                  className="px-4 py-2.5 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Novo Upload
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
