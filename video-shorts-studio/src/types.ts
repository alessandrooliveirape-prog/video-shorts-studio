/* ─── Core Types ─── */

export type AppTab = 'clip' | 'upload-clip' | 'studio' | 'concat';

export interface ClipJob {
  id: string;
  youtubeUrl: string;
  status: 'idle' | 'downloading' | 'analyzing' | 'clipping' | 'done' | 'error';
  progress: number;
  title?: string;
  segments?: ClipSegment[];
  outputPath?: string;
  error?: string;
}

export interface ClipSegment {
  start: number;
  end: number;
  viralHook: string;
  caption: string;
}

/* ─── Studio / "Do Zero" Types ─── */

export interface SceneScript {
  sceneIndex: number;
  sceneDescription: string;
  duration: number;
  caption: string;
  visualPrompt: string;
  characterRef?: string;
}

export interface StudioProject {
  id: string;
  idea: string;
  status: 'idle' | 'scripting' | 'generating' | 'stitching' | 'done' | 'error';
  progress: number;
  scenes: SceneScript[];
  outputPath?: string;
  error?: string;
}

/* ─── API Response Types ─── */

export interface ApiClipResponse {
  success: boolean;
  segments?: ClipSegment[];
  outputPath?: string;
  error?: string;
  jobId: string;
}

export interface ApiVideoPrompt {
  index: number;
  veoPrompt: string;
  caption: string;
}

export interface ApiStudioResponse {
  success: boolean;
  scenes?: SceneScript[];
  videoPrompts?: ApiVideoPrompt[];
  outputPath?: string;
  error?: string;
  projectId: string;
}

export interface ApiStatusResponse {
  status: string;
  progress: number;
  jobId: string;
  outputPath?: string;
  error?: string;
}

/* ─── Audio Effect Options ─── */

export type AudioEffect = 'original' | 'trending_upbeat' | 'cinematic' | 'lofi' | 'edm_drop' | 'viral_audio';

/* ─── Visual Engine Options ─── */

export type VisualEngine = 'pexels' | 'gemini' | 'gemini_video';

/* ─── Subtitle Style Options ─── */

export interface SubtitleOptions {
  style: 'yellow_premium' | 'white_minimal' | 'neon_purple' | 'black_box' | 'glass_modern' | 'neon_cyan' | 'bold_stroke' | 'vibrant_rose';
  position: 'bottom' | 'center' | 'top';
  fontSize: number;
}

export type ScriptMode = 'ai' | 'manual';

export type TransitionType = 'fade' | 'slideleft' | 'circleopen' | 'wipeleft';

/* ─── Voice / TTS Options ─── */

export interface VoiceOption {
  id: string;
  label: string;
  gender: 'male' | 'female';
  description: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  { id: 'pt-BR-AntonioNeural', label: 'Antonio', gender: 'male', description: 'Voz masculina padrão' },
  { id: 'pt-BR-FranciscaNeural', label: 'Francisca', gender: 'female', description: 'Voz feminina clara' },
  { id: 'pt-BR-ThalitaNeural', label: 'Thalita', gender: 'female', description: 'Voz feminina jovem' },
  { id: 'pt-BR-BrendaNeural', label: 'Brenda', gender: 'female', description: 'Voz feminina natural' },
  { id: 'pt-BR-DonatoNeural', label: 'Donato', gender: 'male', description: 'Voz masculina firme' },
  { id: 'pt-BR-FabioNeural', label: 'Fabio', gender: 'male', description: 'Voz masculina enérgica' },
  { id: 'pt-BR-JulioNeural', label: 'Julio', gender: 'male', description: 'Voz masculina calma' },
  { id: 'pt-BR-LeilaNeural', label: 'Leila', gender: 'female', description: 'Voz feminina suave' },
];

/* ─── Template Presets ─── */

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    bg: string;
  };
  subtitleStyle: SubtitleOptions['style'];
  subtitlePosition: SubtitleOptions['position'];
  transitionType: TransitionType;
  transitionDuration: number;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'tech',
    name: 'Tecnologia',
    description: 'Neon futurista com ciano e roxo',
    icon: '💻',
    colors: { primary: '#7c3aed', secondary: '#06b6d4', accent: '#a855f7', bg: '#0f172a' },
    subtitleStyle: 'neon_cyan',
    subtitlePosition: 'bottom',
    transitionType: 'slideleft',
    transitionDuration: 0.5,
  },
  {
    id: 'health',
    name: 'Saúde & Bem-Estar',
    description: 'Tons verdes e orgânicos suaves',
    icon: '🌿',
    colors: { primary: '#059669', secondary: '#10b981', accent: '#34d399', bg: '#022c22' },
    subtitleStyle: 'white_minimal',
    subtitlePosition: 'center',
    transitionType: 'fade',
    transitionDuration: 0.7,
  },
  {
    id: 'motivational',
    name: 'Motivacional',
    description: 'Quente e dramático com laranja',
    icon: '🔥',
    colors: { primary: '#dc2626', secondary: '#f97316', accent: '#fb923c', bg: '#1c1917' },
    subtitleStyle: 'bold_stroke',
    subtitlePosition: 'center',
    transitionType: 'circleopen',
    transitionDuration: 0.6,
  },
  {
    id: 'luxury',
    name: 'Luxo',
    description: 'Elegante dourado e vinho',
    icon: '✨',
    colors: { primary: '#92400e', secondary: '#d97706', accent: '#fbbf24', bg: '#1c1917' },
    subtitleStyle: 'vibrant_rose',
    subtitlePosition: 'bottom',
    transitionType: 'fade',
    transitionDuration: 0.8,
  },
  {
    id: 'gaming',
    name: 'Gaming',
    description: 'Vibrante roxo e rosa choque',
    icon: '🎮',
    colors: { primary: '#7c3aed', secondary: '#ec4899', accent: '#f472b6', bg: '#1e1b4b' },
    subtitleStyle: 'neon_purple',
    subtitlePosition: 'bottom',
    transitionType: 'wipeleft',
    transitionDuration: 0.4,
  },
  {
    id: 'minimalist',
    name: 'Minimalista',
    description: 'Limpo, preto e branco',
    icon: '◻️',
    colors: { primary: '#475569', secondary: '#94a3b8', accent: '#e2e8f0', bg: '#020617' },
    subtitleStyle: 'white_minimal',
    subtitlePosition: 'bottom',
    transitionType: 'fade',
    transitionDuration: 0.3,
  },
];

/* ─── Saved Project (localStorage) ─── */

export interface SavedProject {
  id: string;
  name: string;
  idea: string;
  visualEngine: VisualEngine;
  scriptMode: ScriptMode;
  manualScriptText: string;
  subtitleStyle: SubtitleOptions['style'];
  subtitlePosition: SubtitleOptions['position'];
  transitionType: TransitionType;
  transitionDuration: number;
  voice: string;
  templateId: string | null;
  scenes: SceneScript[];
  createdAt: string;
  updatedAt: string;
}

export interface UploadedVideo {
  fileId: string;
  filename: string;
  savedName: string;
  duration: number;
  fileSize: number;
  status: 'pending' | 'uploading' | 'ready' | 'error';
  progress?: number;
  error?: string;
}

export interface ApiUploadResponse {
  success: boolean;
  fileId: string;
  filename: string;
  savedName: string;
  duration: number;
  fileSize: number;
  error?: string;
}

export interface UploadClipJob {
  id: string;
  filename: string;
  status: 'idle' | 'uploading' | 'analyzing' | 'clipping' | 'done' | 'error';
  progress: number;
  segments?: ClipSegment[];
  outputPath?: string;
  error?: string;
}

export interface ApiConcatResponse {
  success: boolean;
  jobId: string;
  error?: string;
}

/* ─── Upload Clip Request/Response ─── */

export interface ApiUploadClipResponse {
  success: boolean;
  jobId: string;
  segments?: ClipSegment[];
  outputPath?: string;
  error?: string;
}

