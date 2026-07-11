/* ─── Core Types ─── */

export type AppTab = 'clip' | 'studio' | 'concat';

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

export interface ApiStudioResponse {
  success: boolean;
  scenes?: SceneScript[];
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

/* ─── Subtitle Style Options ─── */

export interface SubtitleOptions {
  style: 'yellow_premium' | 'white_minimal' | 'neon_purple' | 'black_box';
  position: 'bottom' | 'center' | 'top';
  fontSize: number;
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

export interface ApiConcatResponse {
  success: boolean;
  jobId: string;
  error?: string;
}

