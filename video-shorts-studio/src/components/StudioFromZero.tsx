import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Film,
  AlertCircle,
  CheckCircle2,
  Download,
  Youtube,
  Loader2,
  Lightbulb,
} from 'lucide-react';
import { SceneScript, StudioProject, ApiStudioResponse } from '@/src/types';
import SceneBlock from './SceneBlock';

interface StudioFromZeroProps {
  onProjectComplete?: (scenes: SceneScript[], videoUrl?: string) => void;
  onCaptionsChange?: (captions: string[]) => void;
  onProcessingChange?: (processing: boolean) => void;
  onPreviewUpdate?: (sceneIndex: number) => void;
}

const IDEA_SUGGESTIONS = [
  'Fatos curiosos sobre o espaço que você não sabia',
  'Dicas rápidas de produtividade para programadores',
  'Transformação de ambiente com decoração DIY',
  'Mitos e verdades sobre alimentação saudável',
  'Tutorial de 30 segundos para aprender algo novo',
];

export default function StudioFromZero({
  onProjectComplete,
  onCaptionsChange,
  onProcessingChange,
  onPreviewUpdate,
}: StudioFromZeroProps) {
  const [idea, setIdea] = useState('');
  const [project, setProject] = useState<StudioProject>({
    id: '',
    idea: '',
    status: 'idle',
    progress: 0,
    scenes: [],
  });
  const [activeScene, setActiveScene] = useState(0);

  const handleGenerate = useCallback(async () => {
    if (!idea.trim()) return;

    const projectId = `studio-${Date.now()}`;
    setProject({
      id: projectId,
      idea: idea.trim(),
      status: 'scripting',
      progress: 10,
      scenes: [],
    });
    onProcessingChange?.(true);

    try {
      // Step 1: Generate script via Gemini
      setProject((prev) => ({ ...prev, status: 'scripting', progress: 25 }));

      const scriptRes = await fetch('/api/studio/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: idea.trim() }),
      });

      if (!scriptRes.ok) {
        throw new Error('Falha ao gerar roteiro');
      }

      const scriptData: ApiStudioResponse = await scriptRes.json();

      if (!scriptData.success || !scriptData.scenes) {
        throw new Error(scriptData.error || 'Falha ao gerar roteiro');
      }

      const scenes = scriptData.scenes;
      // Usar o projectId retornado pelo backend (frontend gera um temporario)
      const backendProjectId = scriptData.projectId || projectId;
      setProject((prev) => ({ ...prev, id: backendProjectId, scenes: scenes, status: 'generating', progress: 40 }));
      onCaptionsChange?.(scenes.map((s) => s.caption));
      
      // Step 2: Generate video blocks for each scene
      for (let i = 0; i < scenes.length; i++) {
        setActiveScene(i);
        const sceneProgress = 40 + ((i + 1) / scenes.length) * 50;

        const genRes = await fetch('/api/studio/generate-scene', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: backendProjectId,
            scene_index: i,
            scene: scenes[i],
            all_scenes: scenes,
          }),
        });

        if (!genRes.ok) {
          throw new Error(`Falha ao gerar cena ${i + 1}`);
        }

        setProject((prev) => ({ ...prev, progress: Math.round(sceneProgress) }));
        onPreviewUpdate?.(i);
      }

      // Step 3: Stitch all scenes together
      setProject((prev) => ({ ...prev, status: 'stitching', progress: 92 }));

      const stitchRes = await fetch('/api/studio/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: backendProjectId, scenes }),
      });

      if (!stitchRes.ok) {
        throw new Error('Falha ao montar vídeo final');
      }

      const stitchData = await stitchRes.json();

      setProject((prev) => ({
        ...prev,
        status: 'done',
        progress: 100,
        outputPath: stitchData.outputPath,
      }));
      onProcessingChange?.(false);
      onProjectComplete?.(scenes, `/api/download/${backendProjectId}`);
    } catch (err: any) {
      setProject((prev) => ({
        ...prev,
        status: 'error',
        error: err.message || 'Erro desconhecido',
        progress: 0,
      }));
      onProcessingChange?.(false);
    }
  }, [idea, onProjectComplete, onCaptionsChange, onProcessingChange, onPreviewUpdate]);

  const handleDownload = useCallback(() => {
    if (project.outputPath) {
      window.open(`/api/download/${project.id}`, '_blank');
    }
  }, [project]);

  const handlePublish = useCallback(async () => {
    if (!project.outputPath) return;
    try {
      const res = await fetch('/api/publish/shorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: project.id,
          output_path: project.outputPath,
          title: project.idea.slice(0, 100),
        }),
      });
      const data = await res.json();
      if (data.auth_url) {
        window.open(data.auth_url, '_blank');
      }
    } catch {
      // Silent fallback
    }
  }, [project]);

  const isProcessing = project.status !== 'idle' && project.status !== 'done' && project.status !== 'error';

  return (
    <div className="flex flex-col gap-5">
      {/* Idea Input Card */}
      <div className="glass-card-solid rounded-2xl p-5 border border-violet-500/20">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-violet-950/20 flex items-center justify-center border border-violet-500/20">
            <Sparkles className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Estúdio do Zero IA</h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Gere vídeos completos do zero com roteirização e B-roll por IA
            </p>
          </div>
        </div>

        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Descreva sua ideia para o vídeo..."
          disabled={isProcessing}
          rows={3}
          className="w-full px-4 py-3 text-xs bg-slate-900/50 border border-slate-800 rounded-xl outline-none transition-all font-medium text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none disabled:opacity-40 disabled:cursor-not-allowed"
        />

        <div className="flex flex-wrap gap-1.5 mt-3">
          {IDEA_SUGGESTIONS.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => setIdea(suggestion)}
              disabled={isProcessing}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/40 hover:bg-slate-800/60 text-slate-300 text-[9px] font-semibold rounded-lg transition-colors border border-slate-800 disabled:opacity-40 cursor-pointer"
            >
              <Lightbulb className="w-2.5 h-2.5 text-fuchsia-400" />
              {suggestion}
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={!idea.trim() || isProcessing}
          className="mt-4 w-full px-5 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-violet-500/15 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando vídeo...
            </>
          ) : (
            <>
              <Film className="w-4 h-4" />
              Gerar Vídeo do Zero
            </>
          )}
        </button>
      </div>

      {/* Progress & Scene List */}
      <AnimatePresence>
        {(project.status !== 'idle') && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex flex-col gap-4"
          >
            {/* Progress Card */}
            {(project.status === 'scripting' || project.status === 'generating' || project.status === 'stitching') && (
              <div className="glass-card-solid rounded-2xl p-5 border border-violet-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                    <span className="text-xs font-bold font-mono text-violet-300">
                      {project.status === 'scripting' && 'Roteirizando com Gemini 3.5...'}
                      {project.status === 'generating' && `Gerando cena ${activeScene + 1} de ${project.scenes.length}...`}
                      {project.status === 'stitching' && 'Concatenando cenas e efeitos...'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {project.progress}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${project.progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 processing-pulse"
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {project.status === 'error' && project.error && (
              <div className="glass-card-solid rounded-2xl p-5 border border-red-500/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-semibold text-red-300">{project.error}</p>
                    <button
                      onClick={() => setProject({ id: '', idea: '', status: 'idle', progress: 0, scenes: [] })}
                      className="text-[10px] font-bold text-red-400 hover:text-red-300 underline mt-1 cursor-pointer"
                    >
                      Tentar novamente
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Scene Blocks */}
            {project.scenes.length > 0 && (
              <div className="glass-card-solid rounded-2xl p-5 border border-violet-500/20">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Roteiro ({project.scenes.length} cenas)
                  </span>
                  <span className="text-[10px] font-mono font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                    ~30s total
                  </span>
                </div>
                <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                  {project.scenes.map((scene, idx) => (
                    <SceneBlock
                      key={idx}
                      scene={scene}
                      index={idx}
                      isActive={idx === activeScene}
                      onClick={setActiveScene}
                      onDelete={() => {
                        const updated = project.scenes.filter((_, i) => i !== idx);
                        setProject((prev) => ({ ...prev, scenes: updated }));
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Done Actions */}
            {project.status === 'done' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card-solid rounded-2xl p-5 border border-violet-500/20"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-violet-300">Vídeo gerado com sucesso!</h4>
                    <p className="text-[10px] text-slate-400">Seu Short está pronto para download ou publicação</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 min-w-[120px] px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-violet-500/10 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download do Short
                  </button>
                  <button
                    onClick={handlePublish}
                    className="flex-1 min-w-[120px] px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-red-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-red-950 cursor-pointer shadow-sm"
                  >
                    <Youtube className="w-4 h-4" />
                    Publicar Shorts
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
