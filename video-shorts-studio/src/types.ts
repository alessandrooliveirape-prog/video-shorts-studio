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
  language: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  // 🇧🇷 Português
  { id: 'pt-BR-AntonioNeural', label: 'Antonio', gender: 'male', description: 'Voz masculina padrão', language: 'pt-BR' },
  { id: 'pt-BR-FranciscaNeural', label: 'Francisca', gender: 'female', description: 'Voz feminina clara', language: 'pt-BR' },
  { id: 'pt-BR-ThalitaNeural', label: 'Thalita', gender: 'female', description: 'Voz feminina jovem', language: 'pt-BR' },
  { id: 'pt-BR-BrendaNeural', label: 'Brenda', gender: 'female', description: 'Voz feminina natural', language: 'pt-BR' },
  { id: 'pt-BR-DonatoNeural', label: 'Donato', gender: 'male', description: 'Voz masculina firme', language: 'pt-BR' },
  { id: 'pt-BR-FabioNeural', label: 'Fabio', gender: 'male', description: 'Voz masculina enérgica', language: 'pt-BR' },
  { id: 'pt-BR-JulioNeural', label: 'Julio', gender: 'male', description: 'Voz masculina calma', language: 'pt-BR' },
  { id: 'pt-BR-LeilaNeural', label: 'Leila', gender: 'female', description: 'Voz feminina suave', language: 'pt-BR' },
  // 🇺🇸 Inglês
  { id: 'en-US-JennyNeural', label: 'Jenny', gender: 'female', description: 'American English female', language: 'en-US' },
  { id: 'en-US-GuyNeural', label: 'Guy', gender: 'male', description: 'American English male', language: 'en-US' },
  { id: 'en-US-AriaNeural', label: 'Aria', gender: 'female', description: 'American English expressive', language: 'en-US' },
  { id: 'en-GB-SoniaNeural', label: 'Sonia', gender: 'female', description: 'British English female', language: 'en-GB' },
  { id: 'en-GB-RyanNeural', label: 'Ryan', gender: 'male', description: 'British English male', language: 'en-GB' },
  // 🇪🇸 Espanhol
  { id: 'es-ES-ElviraNeural', label: 'Elvira', gender: 'female', description: 'Spanish female', language: 'es-ES' },
  { id: 'es-ES-AlvaroNeural', label: 'Alvaro', gender: 'male', description: 'Spanish male', language: 'es-ES' },
  { id: 'es-MX-DaliaNeural', label: 'Dalia', gender: 'female', description: 'Mexican Spanish female', language: 'es-MX' },
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

/* ─── Script Template Presets ─── */

export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  scenes: ScriptTemplateScene[];
}

export interface ScriptTemplateScene {
  description: string;
  duration: number;
  caption: string;
  visualPrompt: string;
}

export const SCRIPT_TEMPLATES: ScriptTemplate[] = [
  {
    id: 'top5',
    name: 'Top 5',
    description: 'Lista dos 5 melhores itens sobre o tema',
    icon: '🏆',
    scenes: [
      { description: 'Abertura impactante com o tema do top 5', duration: 6, caption: 'Os 5 melhores que você precisa conhecer! 🔥', visualPrompt: 'opening countdown top 5 neon lights, energetic' },
      { description: 'Número 5 da lista', duration: 5, caption: 'Número 5: Uma escolha clássica e surpreendente', visualPrompt: 'number 5 glowing, reveal effect' },
      { description: 'Número 4 da lista', duration: 5, caption: 'Número 4: Melhor que a maioria imagina', visualPrompt: 'number 4 reveal, cinematic lighting' },
      { description: 'Número 3 da lista', duration: 5, caption: 'Número 3: Entrando no top 3!', visualPrompt: 'number 3 dramatic reveal, sparks' },
      { description: 'Número 2 da lista', duration: 6, caption: 'Número 2: Quase lá... esse é incrível!', visualPrompt: 'number 2 close-up, intense colors' },
      { description: 'Número 1 - o melhor de todos', duration: 8, caption: 'NÚMERO 1: O melhor de todos! Imperdível! 👑', visualPrompt: 'number 1 golden crown, celebration effects' },
      { description: 'CTA final convidando a seguir', duration: 5, caption: 'Qual sua opinião? Comenta aqui embaixo!', visualPrompt: 'person pointing, call to action' },
    ],
  },
  {
    id: 'tutorial',
    name: 'Tutorial Rápido',
    description: 'Passo a passo rápido de como fazer algo',
    icon: '📚',
    scenes: [
      { description: 'Abertura mostrando o problema que vai resolver', duration: 5, caption: 'Vou te mostrar como resolver isso em 30 segundos! ⏱️', visualPrompt: 'person looking at problem, curious expression' },
      { description: 'Passo 1: preparação e materiais', duration: 6, caption: 'Passo 1: Separe os materiais necessários', visualPrompt: 'hands preparing materials, organized desk' },
      { description: 'Passo 2: execução principal', duration: 7, caption: 'Passo 2: Siga este movimento exato', visualPrompt: 'close-up hands doing the task, step by step' },
      { description: 'Passo 3: finalização e dica extra', duration: 6, caption: 'Passo 3: Finalize com esta dica profissional', visualPrompt: 'finishing touches, detailed close-up' },
      { description: 'Resultado final impressionante', duration: 5, caption: 'Veja o resultado incrível! 🎯', visualPrompt: 'beautiful final result, satisfying reveal' },
      { description: 'CTA para salvar e compartilhar', duration: 5, caption: 'Salva esse vídeo pra não esquecer!', visualPrompt: 'person smiling, phone showing saved video' },
    ],
  },
  {
    id: 'comparison',
    name: 'Antes & Depois',
    description: 'Mostre a transformação ou comparação',
    icon: '🔄',
    scenes: [
      { description: 'Mostrando o estado ANTES', duration: 5, caption: 'Antes: o cenário comum e sem graça 😕', visualPrompt: 'before state, dull lighting, messy environment' },
      { description: 'Transição dramática para o resultado', duration: 4, caption: 'A transformação que mudou tudo! ✨', visualPrompt: 'dramatic transition effect, sparkles, magic' },
      { description: 'Mostrando o resultado DEPOIS', duration: 7, caption: 'Depois: O resultado que todo mundo quer! 😍', visualPrompt: 'after result, beautiful lighting, clean organized' },
      { description: 'Detalhes da transformação', duration: 6, caption: 'Cada detalhe foi pensado com carinho', visualPrompt: 'close-up details, premium quality' },
      { description: 'Dica de como alcançar esse resultado', duration: 6, caption: 'Quer esse resultado também? Faz esse passo!', visualPrompt: 'hands showing the method, instructional' },
      { description: 'CTA para compartilhar a transformação', duration: 5, caption: 'Mostra nos comentários sua transformação! 💬', visualPrompt: 'before and after side by side, comparison' },
    ],
  },
  {
    id: 'review',
    name: 'Review Rápido',
    description: 'Review honesto e direto de um produto/serviço',
    icon: '⭐',
    scenes: [
      { description: 'Abertura com o produto em destaque', duration: 5, caption: 'REVIEW HONESTO: Vale a pena? 🤔', visualPrompt: 'product displayed, dramatic lighting' },
      { description: 'Unboxing ou primeiras impressões', duration: 6, caption: 'Primeiras impressões: parece promissor!', visualPrompt: 'unboxing, hands opening package, exciting' },
      { description: 'Teste prático do produto', duration: 8, caption: 'Testando na prática: será que funciona?', visualPrompt: 'hands using the product, close-up action' },
      { description: 'Prós e contras', duration: 6, caption: 'Prós e contras: nada é perfeito', visualPrompt: 'pros and cons list, balanced view' },
      { description: 'Nota final e veredito', duration: 6, caption: 'NOTA: 8.5/10 - Recomendo sim! 🎯', visualPrompt: 'rating display, score reveal, satisfaction' },
      { description: 'CTA para perguntas e mais reviews', duration: 4, caption: 'Tem esse produto? Me conta sua experiência!', visualPrompt: 'person talking to camera, friendly' },
    ],
  },
  {
    id: 'mythbusting',
    name: 'Mito ou Verdade',
    description: 'Desvende mitos comuns sobre um tema',
    icon: '🔍',
    scenes: [
      { description: 'Abertura misteriosa sobre os mitos', duration: 5, caption: 'Você acreditou nisso por anos? A verdade vai te chocar! 😱', visualPrompt: 'mysterious fog, question marks, dramatic' },
      { description: 'Mito 1: desvendando a crença popular', duration: 7, caption: 'Mito 1: Isso é COMPLETAMENTE falso! ❌', visualPrompt: 'myth symbol, busted effect, red X' },
      { description: 'Explicação científica/fática', duration: 7, caption: 'A verdade científica por trás disso', visualPrompt: 'scientific explanation, educational graphics' },
      { description: 'Mito 2: outra crença comum', duration: 6, caption: 'Mito 2: Isso também não passa de lenda!', visualPrompt: 'another myth busting, blue checkmark' },
      { description: 'Resumo final com todas as verdades', duration: 5, caption: 'Resumo: só a verdade importa! 📋', visualPrompt: 'truth summary, conclusions, checklist' },
      { description: 'CTA para compartilhar a verdade', duration: 5, caption: 'Compartilha com quem ainda acredita nesses mitos!', visualPrompt: 'share button, spreading awareness' },
    ],
  },
];

/* ─── Custom Audio Upload ─── */

export interface CustomAudioTrack {
  id: string;
  name: string;
  savedName: string;
  fileSize: number;
}

/* ─── Upload Clip Request/Response ─── */

export interface ApiUploadClipResponse {
  success: boolean;
  jobId: string;
  segments?: ClipSegment[];
  outputPath?: string;
  error?: string;
}

