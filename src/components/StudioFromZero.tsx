import { useState, useCallback, useEffect, useRef } from 'react';
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
  Radio,
  BrainCircuit,
  Video,
  Paintbrush,
  Pencil,
  Wand2,
  Type,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Mic,
  LayoutTemplate,
  Clock,
  GripVertical,
  Save,
  FolderOpen,
  Trash2,
  Music,
  Eye,
} from 'lucide-react';
import { SceneScript, StudioProject, ApiStudioResponse, VisualEngine, SubtitleOptions, ScriptMode, TransitionType, AVAILABLE_VOICES, TEMPLATE_PRESETS, TemplatePreset, SavedProject, SCRIPT_TEMPLATES, ScriptTemplate, CustomAudioTrack } from '@/src/types';
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

const LANGUAGE_GROUPS: { code: string; label: string; flag: string }[] = [
  { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
  { code: 'en-US', label: 'English (US)', flag: '🇺🇸' },
  { code: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
  { code: 'es-ES', label: 'Español', flag: '🇪🇸' },
  { code: 'es-MX', label: 'Español MX', flag: '🇲🇽' },
];

export default function StudioFromZero({
  onProjectComplete,
  onCaptionsChange,
  onProcessingChange,
  onPreviewUpdate,
}: StudioFromZeroProps) {
  const [idea, setIdea] = useState('');
  const [visualEngine, setVisualEngine] = useState<VisualEngine>('pexels');
  const [scriptMode, setScriptMode] = useState<ScriptMode>('ai');
  const [manualScriptText, setManualScriptText] = useState('');
  const [project, setProject] = useState<StudioProject>({
    id: '',
    idea: '',
    status: 'idle',
    progress: 0,
    scenes: [],
  });
  const [activeScene, setActiveScene] = useState(0);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleOptions['style']>('yellow_premium');
  const [subtitlePosition, setSubtitlePosition] = useState<SubtitleOptions['position']>('bottom');
  const [transitionDuration, setTransitionDuration] = useState(0.5);
  const [transitionType, setTransitionType] = useState<TransitionType>('fade');
  const [voice, setVoice] = useState('pt-BR-AntonioNeural');
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [projectName, setProjectName] = useState('');

  // Script templates
  const [selectedScriptTemplate, setSelectedScriptTemplate] = useState<string | null>(null);
  const [showScriptTemplates, setShowScriptTemplates] = useState(false);

  // Custom audio upload
  const [customAudio, setCustomAudio] = useState<CustomAudioTrack | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Language filter for voices
  const [voiceLanguageFilter, setVoiceLanguageFilter] = useState<string | null>(null);

  // Preview before download
  const [showPreview, setShowPreview] = useState(false);
  const [sceneProgress, setSceneProgress] = useState<Record<number, 'pending' | 'generating' | 'done' | 'error'>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedCountRef = useRef(0);
  const dragIndex = useRef<number | null>(null);

  // Parse manual script text into SceneScript objects
  // Carregar projetos salvos do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('shorts_studio_projects');
      if (raw) setSavedProjects(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Auto-salvar projeto atual
  useEffect(() => {
    if (project.status === 'done' || project.scenes.length === 0) return;
    const timer = setTimeout(() => {
      const toSave: SavedProject = {
        id: project.id,
        name: projectName || `Projeto ${new Date().toLocaleDateString()}`,
        idea,
        visualEngine,
        scriptMode,
        manualScriptText,
        subtitleStyle,
        subtitlePosition,
        transitionType,
        transitionDuration,
        voice,
        templateId: activeTemplate,
        scenes: project.scenes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      try {
        const existing = JSON.parse(localStorage.getItem('shorts_studio_projects') || '[]');
        const idx = existing.findIndex((p: SavedProject) => p.id === project.id);
        if (idx >= 0) existing[idx] = toSave;
        else existing.push(toSave);
        localStorage.setItem('shorts_studio_projects', JSON.stringify(existing.slice(-20)));
        setSavedProjects(existing.slice(-20));
      } catch { /* ignore */ }
    }, 2000);
    return () => clearTimeout(timer);
  }, [project, idea, visualEngine, scriptMode, manualScriptText, subtitleStyle, subtitlePosition, transitionType, transitionDuration, voice, activeTemplate, projectName]);

  // Aplicar template
  const applyTemplate = useCallback((template: TemplatePreset) => {
    setActiveTemplate(template.id);
    setSubtitleStyle(template.subtitleStyle);
    setSubtitlePosition(template.subtitlePosition);
    setTransitionType(template.transitionType);
    setTransitionDuration(template.transitionDuration);
  }, []);

  // Carregar projeto salvo
  const loadProject = useCallback((saved: SavedProject) => {
    setIdea(saved.idea);
    setVisualEngine(saved.visualEngine);
    setScriptMode(saved.scriptMode);
    setManualScriptText(saved.manualScriptText);
    setSubtitleStyle(saved.subtitleStyle);
    setSubtitlePosition(saved.subtitlePosition);
    setTransitionType(saved.transitionType);
    setTransitionDuration(saved.transitionDuration);
    setVoice(saved.voice);
    setActiveTemplate(saved.templateId);
    setProjectName(saved.name);
    setProject(prev => ({
      ...prev,
      id: saved.id,
      idea: saved.idea,
      scenes: saved.scenes,
      status: 'idle',
    }));
    setShowSaveLoad(false);
  }, []);

  // Deletar projeto salvo
  const deleteSavedProject = useCallback((id: string) => {
    try {
      const existing = JSON.parse(localStorage.getItem('shorts_studio_projects') || '[]');
      const filtered = existing.filter((p: SavedProject) => p.id !== id);
      localStorage.setItem('shorts_studio_projects', JSON.stringify(filtered));
      setSavedProjects(filtered);
    } catch { /* ignore */ }
  }, []);

  // Reordenar cenas (drag and drop)
  const moveScene = useCallback((from: number, to: number) => {
    setProject(prev => {
      const scenes = [...prev.scenes];
      const [moved] = scenes.splice(from, 1);
      scenes.splice(to, 0, moved);
      return { ...prev, scenes: scenes.map((s, i) => ({ ...s, sceneIndex: i })) };
    });
  }, []);

  const parseManualScript = useCallback((): SceneScript[] => {
    if (!manualScriptText.trim()) return [];
    
    const lines = manualScriptText.trim().split('\n').filter(line => line.trim());
    const scenes: SceneScript[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split('|').map(p => p.trim());
      const description = parts[0] || `Cena ${i + 1}`;
      const duration = parseFloat(parts[1]) || 6.0;
      const caption = parts[2] || '';
      const visualPrompt = parts[3] || description;
      
      scenes.push({
        sceneIndex: i,
        sceneDescription: description,
        duration: Math.min(Math.max(duration, 3.0), 15.0),
        caption,
        visualPrompt,
      });
    }
    
    return scenes;
  }, [manualScriptText]);

  const MANUAL_SCRIPT_PLACEHOLDER =
    `Digite uma cena por linha, separando os campos com |
Exemplo:
Close-up de mãos digitando no teclado | 6 | Produtividade total! | typing keyboard close-up
Pessoa tomando café relaxada | 5 | Pausa estratégica | drinking coffee relax

Formato: Descrição | Duração(s) | Legenda | Prompt visual Pexels`;

  const handleGenerate = useCallback(async () => {
    const projectId = `studio-${Date.now()}`;
    setProject({
      id: projectId,
      idea: idea.trim(),
      status: 'scripting',
      progress: 10,
      scenes: [],
    });
    onProcessingChange?.(true);

    const subOpts: SubtitleOptions = {
      style: subtitleStyle,
      position: subtitlePosition,
      fontSize: 52,
    };

    try {
      // ── FLUXO VEO: 3 vídeos gerados por IA + concatenação ──
      if (visualEngine === 'gemini_video') {
        if (!idea.trim()) throw new Error('Descreva uma ideia para os vídeos');
        
        // Step 1: Gerar 3 prompts para Veo
        setProject((prev) => ({ ...prev, status: 'scripting', progress: 15 }));
        
        const scriptRes = await fetch('/api/studio/script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea: idea.trim(), visual_engine: 'gemini_video' }),
        });
        
        if (!scriptRes.ok) throw new Error('Falha ao gerar roteiro');
        const scriptData = await scriptRes.json();
        if (!scriptData.success || !scriptData.videoPrompts) {
          throw new Error(scriptData.error || 'Falha ao gerar prompts de vídeo');
        }
        
        const backendProjectId = scriptData.projectId || projectId;
        const videoPrompts = scriptData.videoPrompts;
        setProject((prev) => ({ ...prev, id: backendProjectId, status: 'generating', progress: 30 }));
        onCaptionsChange?.(videoPrompts.map((p: any) => p.caption));
        
        // Step 2: Iniciar geração dos vídeos (background job)
        setProject((prev) => ({ ...prev, status: 'generating', progress: 40 }));
        
        const genRes = await fetch('/api/studio/generate-videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: backendProjectId,
            video_prompts: videoPrompts,
            transition_duration: transitionDuration,
            transition_type: transitionType,
          }),
        });
        
        if (!genRes.ok) throw new Error('Falha ao iniciar geração de vídeos');
        const genData = await genRes.json();
        if (!genData.success || !genData.jobId) {
          throw new Error(genData.error || 'Falha ao iniciar geração');
        }
        
        const veoJobId = genData.jobId;
        
        // Step 3: Polling até completar
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/clip/status/${veoJobId}`);
            const statusData = await statusRes.json();
            
            setProject((prev) => ({
              ...prev,
              progress: statusData.progress || 40,
              status: statusData.status === 'done' ? 'done' : statusData.status === 'error' ? 'error' : 'generating',
            }));
            
            if (statusData.status === 'done') {
              clearInterval(pollInterval);
              setProject((prev) => ({
                ...prev,
                progress: 100,
                outputPath: statusData.outputPath,
              }));
              onProcessingChange?.(false);
            } else if (statusData.status === 'error') {
              clearInterval(pollInterval);
              throw new Error(statusData.error || 'Erro na geração de vídeos');
            }
          } catch {
            clearInterval(pollInterval);
          }
        }, 5000);
        
        setTimeout(() => clearInterval(pollInterval), 900000);
        return;
      }

      // ── FLUXO PEXELS / GEMINI ──
      let scenes: SceneScript[] = [];
      let backendProjectId = projectId;

      if (scriptMode === 'manual') {
        // ── MODO MANUAL: Parse do texto do usuário ──
        const parsed = parseManualScript();
        if (parsed.length === 0) throw new Error('Escreva pelo menos uma cena no formato descrito');
        scenes = parsed;
        setProject((prev) => ({ ...prev, scenes, status: 'generating', progress: 40 }));
        onCaptionsChange?.(scenes.map((s) => s.caption));
      } else {
        // ── MODO IA: Gerar roteiro via Gemini ──
        if (!idea.trim()) throw new Error('Descreva uma ideia para o vídeo');
        
        setProject((prev) => ({ ...prev, status: 'scripting', progress: 25 }));

        const scriptRes = await fetch('/api/studio/script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea: idea.trim(), visual_engine: visualEngine }),
        });

        if (!scriptRes.ok) throw new Error('Falha ao gerar roteiro');

        const scriptData: ApiStudioResponse = await scriptRes.json();
        if (!scriptData.success || !scriptData.scenes) {
          throw new Error(scriptData.error || 'Falha ao gerar roteiro');
        }

        scenes = scriptData.scenes;
        backendProjectId = scriptData.projectId || projectId;
        setProject((prev) => ({ ...prev, id: backendProjectId, scenes, status: 'generating', progress: 40 }));
        onCaptionsChange?.(scenes.map((s) => s.caption));
      }
        // Step 2: Gerar TODAS as cenas em paralelo via batch endpoint ⚡
        setProject((prev) => ({ ...prev, status: 'generating', progress: 40 }));

        // Conectar WebSocket para progresso em tempo real
        connectProgressWS(backendProjectId);

        const batchRes = await fetch('/api/studio/generate-all-scenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: backendProjectId,
            scenes,
            all_scenes: scenes,
            visual_engine: visualEngine,
            subtitle_options: subOpts,
            voice,
          }),
        });

        if (!batchRes.ok) throw new Error('Falha ao gerar cenas em lote');
        const batchData = await batchRes.json();
        if (!batchData.success && !batchData.scenes?.some((s: any) => s.success)) {
          throw new Error(batchData.error || 'Nenhuma cena foi gerada');
        }

        // Atualiza progresso conforme cenas concluídas (fallback para quando não tem WS)
        if (batchData.scenes && !wsRef.current) {
          const completed = batchData.scenes.filter((s: any) => s.success).length;
          const progressMap: Record<number, 'done' | 'error'> = {};
          batchData.scenes.forEach((s: any) => {
            progressMap[s.scene_index] = s.success ? 'done' : 'error';
          });
          setSceneProgress((prev) => ({ ...prev, ...progressMap }));
          setProject((prev) => ({
            ...prev,
            progress: 40 + Math.round((completed / scenes.length) * 50),
          }));
          const lastCompleted = batchData.scenes.filter((s: any) => s.success).pop();
          if (lastCompleted) {
            setActiveScene(lastCompleted.scene_index);
            onPreviewUpdate?.(lastCompleted.scene_index);
          }
        }

      // Step 3: Stitch all scenes together
      setProject((prev) => ({ ...prev, status: 'stitching', progress: 92 }));

      const stitchRes = await fetch('/api/studio/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          project_id: backendProjectId, 
          scenes, 
          visual_engine: visualEngine,
          subtitle_options: subOpts,
          transition_duration: transitionDuration,
          transition_type: transitionType,
          custom_audio: customAudio?.savedName || null,
        }),
      });

      if (!stitchRes.ok) throw new Error('Falha ao montar vídeo final');

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
  }, [idea, visualEngine, scriptMode, subtitleStyle, subtitlePosition, transitionDuration, transitionType, voice, parseManualScript, onProjectComplete, onCaptionsChange, onProcessingChange, onPreviewUpdate]);

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
  const canGenerate = scriptMode === 'ai' ? idea.trim() : parseManualScript().length > 0;

  // ── WebSocket / Polling para progresso em tempo real ──
  const connectProgressWS = useCallback((projectId: string) => {
    // Limpar conexões anteriores
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    // Resetar progresso das cenas
    setSceneProgress({});
    completedCountRef.current = 0;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/progress/${projectId}`;

    let wsConnected = false;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        wsConnected = true;
        console.log('[WS] Conectado ao progresso em tempo real');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'batch_start') {
            const initial: Record<number, 'pending'> = {};
            for (let i = 0; i < (msg.total_scenes || 5); i++) {
              initial[i] = 'pending';
            }
            setSceneProgress(initial);
          }

          if (msg.type === 'scene_complete') {
            setSceneProgress((prev) => ({
              ...prev,
              [msg.scene_index]: msg.success ? 'done' : 'error',
            }));
            // Atualizar progresso geral (usando ref para evitar stale closure)
            completedCountRef.current += 1;
            setProject((prev) => {
              const total = prev.scenes.length || msg.total_scenes || 5;
              const pct = 40 + Math.round((completedCountRef.current / total) * 50);
              return { ...prev, progress: Math.min(pct, 90) };
            });
            if (msg.success) {
              setActiveScene(msg.scene_index);
              onPreviewUpdate?.(msg.scene_index);
            }
          }

          if (msg.type === 'batch_complete') {
            console.log('[WS] Batch concluído');
          }

          if (msg.type === 'heartbeat') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onerror = () => {
        console.warn('[WS] Erro de conexão — usando polling fallback');
        wsConnected = false;
        startPollingFallback(projectId);
      };

      ws.onclose = () => {
        if (!wsConnected) {
          startPollingFallback(projectId);
        }
        wsRef.current = null;
      };

      // Timeout para fallback: se não conectar em 3s, usa polling
      setTimeout(() => {
        if (!wsConnected && !pollingRef.current) {
          startPollingFallback(projectId);
        }
      }, 3000);
    } catch {
      startPollingFallback(projectId);
    }
  }, [onPreviewUpdate]);

  const startPollingFallback = useCallback((projectId: string) => {
    if (pollingRef.current) return;
    console.log('[POLL] Iniciando polling HTTP como fallback');
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/clip/status/${projectId}`);
        const data = await res.json();
        if (data.progress) {
          setProject((prev) => ({
            ...prev,
            progress: Math.max(prev.progress, Math.min(data.progress || 0, 98)),
          }));
        }
        if (data.status === 'done' || data.status === 'error') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch { /* ignore */ }
    }, 3000);
  }, []);

  // Cleanup WebSocket e polling ao desmontar
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  // Estilos de legenda com labels amigáveis
  const SUBTITLE_STYLES: { value: SubtitleOptions['style']; label: string; desc: string; color: string }[] = [
    { value: 'yellow_premium', label: 'Amarelo Premium', desc: 'Texto amarelo com sombra', color: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300' },
    { value: 'white_minimal', label: 'Branco Minimal', desc: 'Branco com sombra sutil', color: 'bg-slate-100/10 border-slate-400/30 text-slate-200' },
    { value: 'neon_purple', label: 'Neon Roxo', desc: 'Roxo neon brilhante', color: 'bg-purple-500/20 border-purple-500/30 text-purple-300' },
    { value: 'black_box', label: 'Caixa Preta', desc: 'Texto branco em caixa preta', color: 'bg-gray-950 border-gray-700/50 text-gray-300' },
    { value: 'glass_modern', label: 'Vidro Moderno', desc: 'Vidro fosco semi-transparente', color: 'bg-sky-500/10 border-sky-400/30 text-sky-200' },
    { value: 'neon_cyan', label: 'Neon Ciano', desc: 'Ciano com glow intenso', color: 'bg-cyan-500/20 border-cyan-400/30 text-cyan-300' },
    { value: 'bold_stroke', label: 'Contorno Forte', desc: 'Branco com borda preta grossa', color: 'bg-white/5 border-white/20 text-white' },
    { value: 'vibrant_rose', label: 'Rose Vibrante', desc: 'Rose gold com brilho quente', color: 'bg-pink-500/20 border-pink-400/30 text-pink-300' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Main Input Card */}
      <div className="glass-card-solid rounded-2xl p-5" style={{ borderColor: 'var(--theme-card-border)' }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center border" style={{
            backgroundColor: 'color-mix(in srgb, var(--theme-accent) 15%, transparent)',
            borderColor: 'color-mix(in srgb, var(--theme-accent) 25%, transparent)',
          }}>
            <Sparkles className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--theme-text-primary)' }}>Estúdio do Zero IA</h3>
            <p className="text-[10px] font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
              Gere vídeos completos com roteirização e B-roll por IA
            </p>
          </div>
        </div>

        {/* Script Mode Toggle */}
        {(visualEngine !== 'gemini_video') && (
          <div className="flex items-center gap-1 p-1 bg-slate-900/60 rounded-xl border border-slate-800 mb-4">
            <button
              onClick={() => setScriptMode('ai')}
              disabled={isProcessing}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                scriptMode === 'ai'
                  ? 'bg-violet-600/20 text-violet-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Wand2 className="w-3 h-3" />
              Roteiro IA
            </button>
            <button
              onClick={() => setScriptMode('manual')}
              disabled={isProcessing}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                scriptMode === 'manual'
                  ? 'bg-amber-600/20 text-amber-300 shadow-sm'
                  : 'text-slate-400 hover:text-slate-300'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <Pencil className="w-3 h-3" />
              Meu roteiro
            </button>
          </div>
        )}

        {/* Script Templates (only in AI mode) */}
        {scriptMode === 'ai' && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary)' }}>Templates de Roteiro</span>
              {selectedScriptTemplate && (
                <button
                  onClick={() => { setSelectedScriptTemplate(null); setIdea(''); }}
                  className="text-[8px] underline ml-auto cursor-pointer" style={{ color: 'var(--theme-text-muted)' }}
                >
                  Limpar
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {SCRIPT_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => {
                    setSelectedScriptTemplate(tpl.id);
                    setScriptMode('ai');
                    setIdea(tpl.id === 'top5' ? `Top 5 melhores ` : tpl.id === 'tutorial' ? `Tutorial: como fazer ` : tpl.id === 'comparison' ? `Antes e depois: transformação de ` : tpl.id === 'review' ? `Review honesto de ` : `Mito ou verdade sobre `);
                  }}
                  disabled={isProcessing}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl text-[9px] font-bold transition-all border cursor-pointer min-w-[76px] ${
                    selectedScriptTemplate === tpl.id
                      ? 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-sm ring-1 ring-violet-500/30'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span className="text-base">{tpl.icon}</span>
                  <span>{tpl.name}</span>
                  <span className="text-[7px] font-normal text-slate-500 text-center leading-tight">{tpl.description}</span>
                </button>
              ))}
            </div>
            {selectedScriptTemplate && (
              <div className="mt-2 p-2 rounded-lg" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-accent) 8%, transparent)', borderColor: 'color-mix(in srgb, var(--theme-accent) 15%, transparent)' }}>
                <span className="text-[9px] font-medium" style={{ color: 'var(--theme-text-secondary)' }}>
                  ✨ Template &ldquo;{SCRIPT_TEMPLATES.find(t => t.id === selectedScriptTemplate)?.name}&rdquo; selecionado — {SCRIPT_TEMPLATES.find(t => t.id === selectedScriptTemplate)?.scenes.length} cenas pré-definidas. Escreva o tema e gere!
                </span>
              </div>
            )}
          </div>
        )}

        {/* AI Mode: Idea Input */}
        {scriptMode === 'ai' ? (
          <>
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
          </>
        ) : (
          /* Manual Mode: Script Textarea */
          <textarea
            value={manualScriptText}
            onChange={(e) => setManualScriptText(e.target.value)}
            placeholder={MANUAL_SCRIPT_PLACEHOLDER}
            disabled={isProcessing}
            rows={8}
            className="w-full px-4 py-3 text-xs bg-slate-900/50 border border-slate-800 rounded-xl outline-none transition-all font-medium text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none disabled:opacity-40 disabled:cursor-not-allowed font-mono"
          />
        )}

        {/* Visual Engine Selector */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => setVisualEngine('pexels')}
            disabled={isProcessing}
            className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
              visualEngine === 'pexels'
                ? 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-md shadow-violet-500/5'
                : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              visualEngine === 'pexels' ? 'bg-violet-500/20' : 'bg-slate-800'
            }`}>
              <Radio className="w-3.5 h-3.5" />
            </div>
            <span>Pexels</span>
            <span className="text-[8px] font-normal text-slate-500">Stock vídeos</span>
          </button>
          <button
            onClick={() => setVisualEngine('gemini')}
            disabled={isProcessing}
            className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
              visualEngine === 'gemini'
                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/5'
                : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              visualEngine === 'gemini' ? 'bg-emerald-500/20' : 'bg-slate-800'
            }`}>
              <BrainCircuit className="w-3.5 h-3.5" />
            </div>
            <span>Imagens IA</span>
            <span className="text-[8px] font-normal text-slate-500">+ Ken Burns</span>
          </button>
          <button
            onClick={() => setVisualEngine('gemini_video')}
            disabled={isProcessing}
            className={`flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
              visualEngine === 'gemini_video'
                ? 'bg-cyan-600/20 border-cyan-500/40 text-cyan-300 shadow-md shadow-cyan-500/5'
                : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              visualEngine === 'gemini_video' ? 'bg-cyan-500/20' : 'bg-slate-800'
            }`}>
              <Video className="w-3.5 h-3.5" />
            </div>
            <span>Veo Vídeos</span>
            <span className="text-[8px] font-normal text-slate-500">3 clips 10s IA</span>
          </button>
        </div>

        {/* Template Presets */}
        {(visualEngine !== 'gemini_video') && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <LayoutTemplate className="w-3 h-3 text-violet-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Template Visual</span>
              {activeTemplate && (
                <button
                  onClick={() => { setActiveTemplate(null); }}
                  className="text-[8px] text-slate-500 hover:text-slate-400 underline ml-auto cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {TEMPLATE_PRESETS.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl)}
                  disabled={isProcessing}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl text-[9px] font-bold transition-all border cursor-pointer min-w-[76px] ${
                    activeTemplate === tpl.id
                      ? 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-sm ring-1 ring-violet-500/30'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span className="text-base">{tpl.icon}</span>
                  <span>{tpl.name}</span>
                  <span className="text-[7px] font-normal text-slate-500 text-center leading-tight">{tpl.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Voice Selector with Language Filter */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Mic className="w-3 h-3" style={{ color: 'var(--theme-accent)' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary)' }}>Voz da Narração</span>
          </div>
          {/* Language filter tabs */}
          <div className="flex gap-1 mb-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setVoiceLanguageFilter(null)}
              className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all border cursor-pointer whitespace-nowrap ${
                voiceLanguageFilter === null
                  ? 'border-violet-500/40 text-violet-300 bg-violet-600/20'
                  : 'border-slate-800 text-slate-400 hover:border-slate-700 bg-slate-900/40'
              }`}
            >
              🌐 Todos
            </button>
            {LANGUAGE_GROUPS.map((lang) => {
              const count = AVAILABLE_VOICES.filter(v => v.language === lang.code).length;
              return (
                <button
                  key={lang.code}
                  onClick={() => setVoiceLanguageFilter(lang.code)}
                  className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all border cursor-pointer whitespace-nowrap ${
                    voiceLanguageFilter === lang.code
                      ? 'border-violet-500/40 text-violet-300 bg-violet-600/20'
                      : 'border-slate-800 text-slate-400 hover:border-slate-700 bg-slate-900/40'
                  }`}
                >
                  {lang.flag} {lang.label} ({count})
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {AVAILABLE_VOICES
              .filter(v => !voiceLanguageFilter || v.language === voiceLanguageFilter)
              .map((v) => (
              <button
                key={v.id}
                onClick={() => setVoice(v.id)}
                disabled={isProcessing}
                className={`flex flex-col items-center gap-0.5 px-1 py-1.5 rounded-xl text-[9px] font-bold transition-all border cursor-pointer ${
                  voice === v.id
                    ? 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-sm'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <span className="text-[10px]">{v.gender === 'female' ? '♀' : '♂'}</span>
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Subtitle Style Selector */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Paintbrush className="w-3 h-3 text-violet-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estilo da Legenda</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mb-1.5">
            {SUBTITLE_STYLES.slice(0, 4).map((st) => (
              <button
                key={st.value}
                onClick={() => setSubtitleStyle(st.value)}
                disabled={isProcessing}
                className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-xl text-[9px] font-bold transition-all border cursor-pointer ${
                  subtitleStyle === st.value
                    ? `${st.color} shadow-sm`
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Type className="w-3 h-3" />
                <span className="leading-tight text-center">{st.label}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {SUBTITLE_STYLES.slice(4).map((st) => (
              <button
                key={st.value}
                onClick={() => setSubtitleStyle(st.value)}
                disabled={isProcessing}
                className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-xl text-[9px] font-bold transition-all border cursor-pointer ${
                  subtitleStyle === st.value
                    ? `${st.color} shadow-sm`
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Type className="w-3 h-3" />
                <span className="leading-tight text-center">{st.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Position Selector */}
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <AlignCenterVertical className="w-3 h-3 text-violet-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Posição</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['top', 'center', 'bottom'] as const).map((pos) => (
              <button
                key={pos}
                onClick={() => setSubtitlePosition(pos)}
                disabled={isProcessing}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all border cursor-pointer ${
                  subtitlePosition === pos
                    ? 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-sm'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {pos === 'top' && <AlignStartVertical className="w-3 h-3" />}
                {pos === 'center' && <AlignCenterVertical className="w-3 h-3" />}
                {pos === 'bottom' && <AlignEndVertical className="w-3 h-3" />}
                {pos === 'top' && 'Topo'}
                {pos === 'center' && 'Centro'}
                {pos === 'bottom' && 'Baixo'}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Music Upload */}
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-3 h-3" style={{ color: 'var(--theme-accent2)' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-secondary)' }}>Música Personalizada</span>
            {customAudio && (
              <button
                onClick={() => setCustomAudio(null)}
                className="text-[8px] underline ml-auto cursor-pointer" style={{ color: 'var(--theme-text-muted)' }}
              >
                Remover
              </button>
            )}
          </div>
          <div
            onClick={() => audioInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              customAudio
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-slate-800 hover:border-slate-700 bg-slate-900/30'
            }`}
          >
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);
                try {
                  const res = await fetch('/api/audio/upload', {
                    method: 'POST',
                    body: formData,
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setCustomAudio({
                      id: data.fileId || Math.random().toString(36),
                      name: data.filename || file.name,
                      savedName: data.savedName || '',
                      fileSize: data.fileSize || file.size,
                    });
                  }
                } catch { /* silint fail */ }
              }}
            />
            {customAudio ? (
              <div className="flex items-center justify-center gap-2 text-[10px]">
                <span className="text-emerald-400">✅</span>
                <span className="font-bold text-emerald-300">{customAudio.name}</span>
                <span className="text-slate-500">({(customAudio.fileSize / 1024 / 1024).toFixed(1)} MB)</span>
              </div>
            ) : (
              <>
                <Music className="w-5 h-5 mx-auto mb-1" style={{ color: 'var(--theme-text-muted)' }} />
                <p className="text-[10px] font-bold" style={{ color: 'var(--theme-text-secondary)' }}>
                  Clique para enviar sua própria música de fundo
                </p>
                <p className="text-[8px]" style={{ color: 'var(--theme-text-muted)' }}>MP3, WAV, OGG — Max 20MB</p>
              </>
            )}
          </div>
        </div>

        {/* Transition Type Selector */}
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <Video className="w-3 h-3 text-violet-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transição</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {([
              { value: 'fade' as TransitionType, label: 'Crossfade', desc: 'Fade suave' },
              { value: 'slideleft' as TransitionType, label: 'Slide', desc: 'Deslizar' },
              { value: 'circleopen' as TransitionType, label: 'Círculo', desc: 'Abertura' },
              { value: 'wipeleft' as TransitionType, label: 'Wipe', desc: 'Limpar' },
            ]).map((t) => (
              <button
                key={t.value}
                onClick={() => setTransitionType(t.value)}
                disabled={isProcessing}
                className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-xl text-[9px] font-bold transition-all border cursor-pointer ${
                  transitionType === t.value
                    ? 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-sm'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <span className="leading-tight text-center">{t.label}</span>
                <span className="text-[7px] font-normal text-slate-500">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Transition Preview Animation */}
        <div className="mt-3 h-14 rounded-xl overflow-hidden border border-slate-800/50 bg-slate-900/30 relative">
          <div className={`absolute inset-0 flex trans-preview-${transitionType}`}>
            <div className="flex-1 h-full trans-preview-a" style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            }} />
            <div className="absolute inset-0 trans-preview-b" style={{
              background: 'linear-gradient(135deg, #0d9488, #14b8a6)',
            }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center px-3">
            <div className="flex items-center gap-2 text-[9px] font-bold font-mono tracking-wide">
              <span className="px-2 py-0.5 rounded bg-slate-950/60 text-violet-300 border border-violet-500/20">
                Cena A
              </span>
              <span className="text-white/60">
                {transitionType === 'fade' && '⟷'}
                {transitionType === 'slideleft' && '⟶'}
                {transitionType === 'circleopen' && '⭘'}
                {transitionType === 'wipeleft' && '⟶'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-950/60 text-emerald-300 border border-emerald-500/20">
                Cena B
              </span>
            </div>
          </div>
        </div>

        {/* Transition Duration Slider */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duração</span>
            </div>
            <span className="text-[9px] font-mono font-bold text-violet-400">{transitionDuration.toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min="0.3"
            max="1.0"
            step="0.1"
            value={transitionDuration}
            onChange={(e) => setTransitionDuration(parseFloat(e.target.value))}
            disabled={isProcessing}
            className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-violet-500 disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-violet-500/30 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
          />
          <div className="flex justify-between mt-1 px-0.5">
            <span className="text-[8px] text-slate-500">Suave</span>
            <span className="text-[8px] text-slate-500">Longa</span>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!canGenerate || isProcessing}
          className={`mt-4 w-full px-5 py-3 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg cursor-pointer ${
            visualEngine === 'gemini'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/15'
              : visualEngine === 'gemini_video'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-cyan-500/15'
              : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 shadow-violet-500/15'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando vídeo...
            </>
          ) : (
            <>
              {visualEngine === 'gemini_video' ? <Video className="w-4 h-4" /> : visualEngine === 'gemini' ? <BrainCircuit className="w-4 h-4" /> : <Film className="w-4 h-4" />}
              {scriptMode === 'manual' ? 'Gerar do Meu Roteiro' : 'Gerar Vídeo do Zero'}
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
                      {project.status === 'generating' && `Renderizando ${Object.values(sceneProgress).filter(v => v === 'done' || v === 'error').length} de ${project.scenes.length} cenas...`}
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

            {/* Timeline Visual com Reordenação */}
            {project.scenes.length > 0 && (
              <div className="glass-card-solid rounded-2xl p-5 border border-violet-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Timeline ({project.scenes.length} cenas)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                      ~{project.scenes.reduce((t, s) => t + s.duration, 0).toFixed(0)}s
                    </span>
                    {/* Save / Load buttons */}
                    <button
                      onClick={() => setShowSaveLoad(!showSaveLoad)}
                      className="text-[9px] text-slate-500 hover:text-slate-300 transition-colors p-1 rounded cursor-pointer"
                      title="Salvar / Carregar projeto"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Save/Load Panel */}
                {showSaveLoad && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Nome do projeto..."
                        className="flex-1 px-2.5 py-1.5 text-[10px] bg-slate-900/80 border border-slate-700 rounded-lg outline-none text-slate-200 placeholder:text-slate-500 focus:border-violet-500"
                      />
                      <button
                        onClick={() => {
                          const toSave: SavedProject = {
                            id: project.id,
                            name: projectName || `Projeto ${new Date().toLocaleDateString()}`,
                            idea,
                            visualEngine,
                            scriptMode,
                            manualScriptText,
                            subtitleStyle,
                            subtitlePosition,
                            transitionType,
                            transitionDuration,
                            voice,
                            templateId: activeTemplate,
                            scenes: project.scenes,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          };
                          try {
                            const existing = JSON.parse(localStorage.getItem('shorts_studio_projects') || '[]');
                            const idx = existing.findIndex((p: SavedProject) => p.id === project.id);
                            if (idx >= 0) existing[idx] = toSave;
                            else existing.push(toSave);
                            localStorage.setItem('shorts_studio_projects', JSON.stringify(existing.slice(-20)));
                            setSavedProjects(existing.slice(-20));
                          } catch { /* ignore */ }
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[9px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        <Save className="w-3 h-3" />
                        Salvar
                      </button>
                    </div>
                    {savedProjects.length > 0 && (
                      <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto">
                        <span className="text-[8px] text-slate-500 font-semibold uppercase">Projetos salvos:</span>
                        {savedProjects.map((sp) => (
                          <div key={sp.id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800/50 border border-slate-700/50">
                            <span className="flex-1 text-[9px] text-slate-300 truncate">{sp.name || 'Sem nome'}</span>
                            <span className="text-[8px] text-slate-500">{sp.scenes.length} cenas</span>
                            <button
                              onClick={() => loadProject(sp)}
                              className="text-[9px] text-violet-400 hover:text-violet-300 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                            >
                              Abrir
                            </button>
                            <button
                              onClick={() => deleteSavedProject(sp.id)}
                              className="text-[9px] text-red-400 hover:text-red-300 px-1 py-0.5 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Timeline barra de durações */}
                <div className="flex h-2 rounded-full overflow-hidden mb-3 bg-slate-900">
                  {project.scenes.map((s, i) => {
                    const total = project.scenes.reduce((t, sc) => t + sc.duration, 0);
                    const pct = (s.duration / total) * 100;
                    const colors = ['bg-violet-500', 'bg-fuchsia-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-purple-500'];
                    return (
                      <div
                        key={i}
                        className={`${colors[i % colors.length]} transition-all ${i === activeScene ? 'opacity-100 scale-y-125' : 'opacity-70'}`}
                        style={{ width: `${pct}%` }}
                        onClick={() => setActiveScene(i)}
                      />
                    );
                  })}
                </div>

                {/* Cenas com Drag to Reorder */}
                <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                  {project.scenes.map((scene, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={() => { dragIndex.current = idx; }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragIndex.current !== null && dragIndex.current !== idx) {
                          moveScene(dragIndex.current, idx);
                          dragIndex.current = idx;
                        }
                      }}
                      onDragEnd={() => { dragIndex.current = null; }}
                      className={`flex items-center gap-1.5 rounded-xl transition-colors ${
                        idx === activeScene ? 'bg-violet-500/10 ring-1 ring-violet-500/20' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <div className="cursor-grab active:cursor-grabbing px-1 py-3 text-slate-500 hover:text-slate-300">
                        <GripVertical className="w-3 h-3" />
                      </div>
                      {/* Per-scene progress indicator */}
                      <div className="flex-shrink-0 w-5 flex items-center justify-center">
                        {sceneProgress[idx] === 'done' && (
                          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          </div>
                        )}
                        {sceneProgress[idx] === 'error' && (
                          <div className="w-3.5 h-3.5 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center">
                            <AlertCircle className="w-2.5 h-2.5 text-red-400" />
                          </div>
                        )}
                        {sceneProgress[idx] === 'pending' && (
                          <div className="w-3.5 h-3.5 rounded-full bg-slate-700 border border-slate-600">
                            <div className="w-full h-full rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
                          </div>
                        )}
                        {!sceneProgress[idx] && (
                          <div className="w-2 h-2 rounded-full bg-slate-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <SceneBlock
                          scene={scene}
                          index={idx}
                          isActive={idx === activeScene}
                          onClick={setActiveScene}
                          onDelete={() => {
                            const updated = project.scenes.filter((_, i) => i !== idx);
                            setProject((prev) => ({ ...prev, scenes: updated.map((s, i) => ({ ...s, sceneIndex: i })) }));
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Done Actions */}
            {project.status === 'done' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card-solid rounded-2xl p-5" style={{ borderColor: 'var(--theme-card-border)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center border" style={{
                    backgroundColor: 'color-mix(in srgb, var(--theme-accent) 10%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--theme-accent) 20%, transparent)',
                  }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold" style={{ color: 'var(--theme-accent)' }}>Vídeo gerado com sucesso!</h4>
                    <p className="text-[10px]" style={{ color: 'var(--theme-text-secondary)' }}>Seu Short está pronto! Pré-visualize, baixe ou publique</p>
                  </div>
                </div>

                {/* Preview Player */}
                {showPreview && project.outputPath && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-4 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--theme-border)' }}
                  >
                    <video
                      src={`/api/download/${project.id}`}
                      controls
                      className="w-full max-h-[400px] object-contain bg-black"
                      autoPlay={false}
                      preload="metadata"
                    >
                      Seu navegador não suporta vídeo.
                    </video>
                  </motion.div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex-1 min-w-[100px] px-4 py-2.5 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md cursor-pointer"
                    style={{
                      backgroundColor: showPreview ? 'color-mix(in srgb, var(--theme-accent) 60%, black)' : 'var(--theme-accent)',
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    {showPreview ? 'Fechar Preview' : 'Pré-visualizar'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex-1 min-w-[100px] px-4 py-2.5 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-violet-500/10 cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-accent)' }}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={handlePublish}
                    className="flex-1 min-w-[100px] px-4 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] border cursor-pointer"
                    style={{
                      color: 'var(--theme-accent2)',
                      borderColor: 'color-mix(in srgb, var(--theme-accent2) 30%, transparent)',
                      backgroundColor: 'color-mix(in srgb, var(--theme-accent2) 8%, transparent)',
                    }}
                  >
                    <Youtube className="w-4 h-4" />
                    Publicar
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
