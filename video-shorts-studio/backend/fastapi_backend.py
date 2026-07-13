"""
Shorts Studio - FastAPI Backend (100% Gratuito)
=================================================
APIs gratuitas utilizadas:
  [OK] Google GenAI SDK (Gemini 3.5 Flash) - Análise de texto, roteirização, ganchos virais
  [OK] yt-dlp                           - Download de vídeos do YouTube
  [OK] FFmpeg                           - Corte 9:16, geração de cenas, concatenação, efeitos, CTA
  [OK] Edge TTS                         - Narração de áudio por voz gratuita
"""

from __future__ import annotations

import asyncio
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import time
import traceback
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import requests as http_req
from pydantic import BaseModel, Field
from PIL import Image
from google import genai
from google.genai import types

# --- Load Environment ------------------------------------------------
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# --- Paths -----------------------------------------------------------
BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

# --- B-roll Cache (Pexels) ------------------------------------------
BROLL_CACHE_DIR = OUTPUT_DIR / "broll_cache"
BROLL_CACHE_DIR.mkdir(exist_ok=True)
BROLL_CACHE_TTL = 24 * 60 * 60  # 24 horas em segundos


def _get_broll_cache_key(query: str) -> str:
    """Gera uma chave de cache única para uma query de B-roll."""
    import hashlib
    normalized = query.strip().lower()[:80]
    return hashlib.md5(normalized.encode()).hexdigest()


def _clean_broll_cache():
    """Remove arquivos de cache expirados (mais de 24h)."""
    if not BROLL_CACHE_DIR.exists():
        return
    now = time.time()
    removed = 0
    for f in BROLL_CACHE_DIR.iterdir():
        if f.is_file() and f.suffix in (".mp4", ".webm", ".json"):
            age = now - f.stat().st_mtime
            if age > BROLL_CACHE_TTL:
                f.unlink(missing_ok=True)
                removed += 1
    if removed:
        print(f"  [BROLL CACHE] Limpos {removed} arquivos expirados do cache")


_clean_broll_cache()

# --- Google GenAI Client ---------------------------------------------
gemini_client: genai.Client | None = None

def get_gemini_client() -> genai.Client | None:
    """Retorna o cliente Google GenAI. Retorna None se não houver chave (modo simulado)."""
    global gemini_client
    if gemini_client is None and GEMINI_API_KEY:
        try:
            gemini_client = genai.Client(api_key=GEMINI_API_KEY)
        except Exception as e:
            print(f"  [WARN] Erro ao inicializar cliente Google GenAI: {e}")
            gemini_client = None
    return gemini_client

# --- FFmpeg Check ----------------------------------------------------
def ensure_ffmpeg():
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        raise RuntimeError(
            "FFmpeg não encontrado no PATH. Instale-o para prosseguir."
        )

ensure_ffmpeg()

# --- Font Check (para drawtext) --------------------------------------
def _find_system_font() -> str:
    """Retorna o caminho de uma fonte TTF disponível no sistema."""
    candidates = [
        # Windows
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/calibri.ttf",
        "C:/Windows/Fonts/verdana.ttf",
        # macOS
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Helvetica.ttf",
        "/Library/Fonts/Arial.ttf",
        # Linux
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return ""

SYSTEM_FONT = _find_system_font()

# --- App Lifespan ----------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[START] Shorts Studio Backend - Iniciando...")
    if GEMINI_API_KEY:
        print(f"  [OK] Google GenAI configurado com o modelo: {GEMINI_MODEL}")
    else:
        print("  [WARN] GEMINI_API_KEY/GOOGLE_API_KEY não definida - modo simulado ativado")
    if not PEXELS_API_KEY:
        print("  [WARN] PEXELS_API_KEY não definida - busca de B-roll no Pexels desativada")
        print("         Cenas usarão gradientes animados como fallback visual.")
    if SYSTEM_FONT:
        print(f"  [OK] Fonte para legendas: {Path(SYSTEM_FONT).name}")
    else:
        print("  [WARN] Nenhuma fonte TTF encontrada - legendas não serão renderizadas nos vídeos")
    print(f"  [DIR] Outputs: {OUTPUT_DIR}")
    yield
    print("[BYE] Servidor encerrado.")

# --- FastAPI App -----------------------------------------------------
app = FastAPI(
    title="Shorts Studio API",
    version="1.2.0",
    description="API para criação e clipping de vídeos verticais usando Gemini 3.5 Flash e FFmpeg",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas camelCase conversion --------------------------
def _camel_case(s: str) -> str:
    parts = s.split('_')
    return parts[0] + ''.join(p.capitalize() for p in parts[1:])

class BaseSchema(BaseModel):
    model_config = {
        "alias_generator": _camel_case,
        "populate_by_name": True,
    }

class SubtitleOptions(BaseModel):
    style: str = Field("yellow_premium", description="Estilo: yellow_premium, white_minimal, neon_purple, black_box")
    position: str = Field("bottom", description="Posição: bottom, center, top")
    font_size: int = Field(52, alias="fontSize", description="Tamanho da fonte em px")

class ClipExtractRequest(BaseModel):
    youtube_url: str = Field(..., description="URL do vídeo do YouTube")
    audio_effect: str = Field("original", description="Efeito de áudio desejado")
    subtitle_options: Optional[SubtitleOptions] = Field(None, alias="subtitleOptions")

class ClipSegment(BaseSchema):
    start: float
    end: float
    viral_hook: str
    caption: str

class ClipExtractResponse(BaseSchema):
    success: bool
    job_id: str
    segments: Optional[list[ClipSegment]] = None
    output_path: Optional[str] = None
    error: Optional[str] = None

class StudioScriptRequest(BaseModel):
    idea: str = Field(..., description="Ideia para o vídeo")
    visual_engine: str = Field("pexels", description="Motor visual: pexels, gemini ou gemini_video")

class VideoPrompt(BaseSchema):
    index: int
    veo_prompt: str = Field(..., description="Prompt detalhado em inglês para gerar o vídeo via Veo")
    caption: str = Field(..., description="Legenda em português para o vídeo")

class VideoScriptResponse(BaseSchema):
    success: bool
    project_id: str
    video_prompts: Optional[list[VideoPrompt]] = None
    error: Optional[str] = None

class GenerateVideosRequest(BaseModel):
    project_id: str
    video_prompts: list[VideoPrompt]
    transition_duration: Optional[float] = Field(None, description="Duração do crossfade entre vídeos (0.3-1.0s)")
    transition_type: Optional[str] = Field(None, description="Tipo: fade, slideleft, circleopen, wipeleft")

class GenerateVideosResponse(BaseSchema):
    success: bool
    job_id: str
    error: Optional[str] = None

class SceneScript(BaseSchema):
    scene_index: int
    scene_description: str
    duration: float
    caption: str
    visual_prompt: str
    character_ref: Optional[str] = None

class StudioScriptResponse(BaseSchema):
    success: bool
    project_id: str
    scenes: Optional[list[SceneScript]] = None
    error: Optional[str] = None

class StudioSceneGenerateRequest(BaseModel):
    project_id: str
    scene_index: int
    scene: SceneScript
    all_scenes: list[SceneScript]
    subtitle_options: Optional[SubtitleOptions] = Field(None)
    visual_engine: str = Field("pexels", description="Motor visual: pexels ou gemini")
    voice: Optional[str] = Field(None, description="ID da voz Edge TTS")

class StudioStitchRequest(BaseModel):
    project_id: str
    scenes: list[SceneScript]
    subtitle_options: Optional[SubtitleOptions] = Field(None)
    visual_engine: str = Field("pexels", description="Motor visual usado na geração das cenas")
    transition_duration: Optional[float] = Field(None, description="Duração do crossfade entre cenas (0.3-1.0s)")
    transition_type: Optional[str] = Field(None, description="Tipo: fade, slideleft, circleopen, wipeleft")
    custom_audio: Optional[str] = Field(None, alias="customAudio", description="Nome do arquivo de áudio personalizado enviado via /api/audio/upload")

class StudioGenerateResponse(BaseSchema):
    success: bool
    scene_index: int
    output_path: Optional[str] = None
    error: Optional[str] = None

class StudioGenerateAllRequest(BaseModel):
    project_id: str
    scenes: list[SceneScript]
    all_scenes: list[SceneScript]
    subtitle_options: Optional[SubtitleOptions] = Field(None)
    visual_engine: str = Field("pexels", description="Motor visual: pexels ou gemini")
    voice: Optional[str] = Field(None, description="ID da voz Edge TTS")

class StudioGenerateAllResponse(BaseSchema):
    success: bool
    scenes: Optional[list[dict]] = None
    error: Optional[str] = None

class StudioStitchResponse(BaseSchema):
    success: bool
    project_id: str
    output_path: Optional[str] = None
    error: Optional[str] = None

class JobStatusResponse(BaseSchema):
    status: str
    progress: int
    job_id: str
    output_path: Optional[str] = None
    error: Optional[str] = None

class PublishShortsRequest(BaseModel):
    job_id: str
    output_path: str
    title: str = "Meu Short"
    description: str = "Criado com Shorts Studio 🎬"

class VideoUploadResponse(BaseSchema):
    success: bool
    file_id: str
    filename: str
    saved_name: str
    duration: float
    file_size: int
    error: Optional[str] = None

class VideoConcatRequest(BaseModel):
    video_files: list[str] = Field(..., alias="videoFiles")
    audio_effect: str = Field("original", alias="audioEffect")
    title_text: Optional[str] = Field(None, alias="titleText")
    transition_duration: Optional[float] = Field(None, description="Duração do crossfade (0.3-1.0s)")
    transition_type: Optional[str] = Field(None, description="Tipo: fade, slideleft, circleopen, wipeleft")

class VideoConcatResponse(BaseSchema):
    success: bool
    job_id: str
    error: Optional[str] = None

class HealthResponse(BaseSchema):
    status: str
    version: str
    ffmpeg_available: bool
    gemini_configured: bool

# --- In-memory Job Store ---------------------------------------------
jobs: dict[str, dict] = {}

def get_job(job_id: str) -> dict:
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job não encontrado")
    return jobs[job_id]

def update_job(job_id: str, **updates):
    if job_id in jobs:
        jobs[job_id].update(updates)

# --- Subtitle Wrapping and Formatting Helper ------------------------
def wrap_text(text: str, max_chars: int = 25) -> str:
    """Quebra o texto em várias linhas com no máximo max_chars caracteres por linha."""
    words = text.split()
    lines = []
    current_line = []
    current_length = 0
    for word in words:
        if current_length + len(word) + (1 if current_line else 0) > max_chars:
            if current_line:
                lines.append(" ".join(current_line))
                current_line = [word]
                current_length = len(word)
            else:
                lines.append(word)
                current_length = 0
        else:
            current_line.append(word)
            current_length += len(word) + (1 if current_line else 0)
    if current_line:
        lines.append(" ".join(current_line))
    return "\n".join(lines)

def _build_drawtext_filter(
    text: str,
    font_path: str,
    subtitle_options: SubtitleOptions | None = None,
    temp_txt_path: Path | None = None
) -> str:
    """Gera o filtro drawtext do FFmpeg configurado com as opções do usuário e quebras de linha."""
    if not font_path or not text:
        return ""
        
    # Extrair opções com fallbacks seguros
    style = "yellow_premium"
    position = "bottom"
    font_size = 52
    
    if subtitle_options:
        style = subtitle_options.style
        position = subtitle_options.position
        font_size = subtitle_options.font_size

    # Quebrar o texto (limite de 25 caracteres por linha para vídeo vertical)
    wrapped_text = wrap_text(text, max_chars=25)
    
    # Escrever para arquivo temporário se fornecido para evitar problemas de escaping
    if temp_txt_path:
        with open(temp_txt_path, "w", encoding="utf-8") as f:
            f.write(wrapped_text)
        # Substitui os caracteres de caminho do Windows para serem compatíveis com FFmpeg
        safe_path = str(temp_txt_path).replace("\\", "/").replace(":", "\\:")
        text_source = f"textfile='{safe_path}'"
    else:
        escaped_txt = wrapped_text.replace(chr(39), "").replace(':', '')
        text_source = f"text='{escaped_txt}'"

    # Posição Y
    if position == "top":
        y_expr = "180"
    elif position == "center":
        y_expr = "(h-text_h)/2"
    else: # bottom
        y_expr = "h-text_h-180"

    font_p = font_path.replace(':', '\\:')
    base_filter = f"drawtext={text_source}:fontfile='{font_p}':fontsize={font_size}:x=(w-text_w)/2:y={y_expr}"

    # Estilos
    if style == "white_minimal":
        style_params = ":fontcolor=white:shadowcolor=black@0.6:shadowx=2:shadowy=2"
    elif style == "neon_purple":
        style_params = ":fontcolor=0xE879F9:shadowcolor=0x8B5CF6@0.8:shadowx=3:shadowy=3"
    elif style == "black_box":
        style_params = ":fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=15"
    elif style == "glass_modern":
        # Vidro fosco semi-transparente com texto branco (efeito glassmorphism)
        style_params = ":fontcolor=white:box=1:boxcolor=black@0.35:boxborderw=18:shadowcolor=black@0.3:shadowx=2:shadowy=2"
    elif style == "neon_cyan":
        # Ciano neon com glow cintilante
        style_params = ":fontcolor=0x00E5FF:bordercolor=0x00B8D4:borderw=3:shadowcolor=0x00E5FF@0.5:shadowx=5:shadowy=5"
    elif style == "bold_stroke":
        # Branco com contorno preto grosso (estilo TikTok)
        style_params = ":fontcolor=white:bordercolor=black:borderw=4:shadowcolor=black@0.9:shadowx=3:shadowy=3"
    elif style == "vibrant_rose":
        # Rose gold com sombra quente
        style_params = ":fontcolor=0xFF6B9D:bordercolor=0xCC5280:borderw=2:shadowcolor=0x8B2F50@0.5:shadowx=3:shadowy=3"
    else: # yellow_premium
        style_params = ":fontcolor=yellow:shadowcolor=black@0.8:shadowx=4:shadowy=4"

    return base_filter + style_params

# --- Utility Functions -----------------------------------------------
def run_ffmpeg(args: list[str], timeout: int = 300) -> tuple[int, str, str]:
    """Executa FFmpeg e retorna (returncode, stdout, stderr)."""
    try:
        result = subprocess.run(
            ["ffmpeg", "-y"] + args,
            capture_output=True, text=True, timeout=timeout,
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Timeout ao executar FFmpeg"
    except FileNotFoundError:
        raise RuntimeError("FFmpeg não encontrado no PATH")

def format_timestamp(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"

def _search_and_download_broll(query: str, output_path: Path, timeout: int = 45) -> bool:
    """Busca vídeo B-roll no Pexels e baixa para o caminho especificado.
    
    Com cache local: se a mesma query já foi baixada nas últimas 24h,
    copia do cache em vez de baixar novamente.
    """
    if not PEXELS_API_KEY:
        return False
    
    keywords = query[:80].strip()
    cache_key = _get_broll_cache_key(keywords)
    cache_video_path = BROLL_CACHE_DIR / f"{cache_key}.mp4"
    cache_meta_path = BROLL_CACHE_DIR / f"{cache_key}.json"
    
    # ── Verificar cache ──
    if cache_video_path.exists() and cache_video_path.stat().st_size > 1024:
        cache_age = time.time() - cache_video_path.stat().st_mtime
        if cache_age < BROLL_CACHE_TTL:
            # Cache hit! Copiar para o destino
            print(f"  [B-ROLL CACHE] Cache hit para \"{keywords}\" ({cache_age/60:.0f}min atrás) — copiando...")
            shutil.copy2(cache_video_path, output_path)
            return output_path.exists() and output_path.stat().st_size > 1024
        else:
            print(f"  [B-ROLL CACHE] Cache expirado para \"{keywords}\" ({cache_age/3600:.1f}h) — baixando novamente")
    
    # ── Cache miss: buscar e baixar ──
    try:
        url = "https://api.pexels.com/videos/search"
        headers = {"Authorization": PEXELS_API_KEY}
        params = {"query": keywords, "per_page": 5, "orientation": "portrait", "size": "medium"}
        
        resp = http_req.get(url, headers=headers, params=params, timeout=15)
        if resp.status_code != 200:
            return False
        
        data = resp.json()
        videos = data.get("videos", [])
        if not videos:
            return False
        
        video = videos[0]
        video_files = video.get("video_files", [])
        video_files.sort(key=lambda v: v.get("height", 0), reverse=True)
        
        selected = None
        for vf in video_files:
            if vf.get("height", 0) <= 1080 and vf.get("link", ""):
                selected = vf
                break
        if not selected and video_files:
            selected = video_files[0]
        
        if not selected or not selected.get("link"):
            return False
        
        video_url = selected["link"]
        print(f"  [B-ROLL] Downloading fresh: {video_url[:60]}...")
        
        video_resp = http_req.get(video_url, timeout=timeout, stream=True)
        if video_resp.status_code != 200:
            return False
        
        # Baixar para cache primeiro
        with open(cache_video_path, "wb") as f:
            for chunk in video_resp.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        # Salvar metadados da busca
        try:
            with open(cache_meta_path, "w") as f:
                json.dump({
                    "query": keywords,
                    "cached_at": time.time(),
                    "source_url": video_url,
                    "pexels_id": video.get("id", 0),
                    "duration": video.get("duration", 0),
                }, f)
        except Exception:
            pass
        
        # Copiar do cache para o destino
        shutil.copy2(cache_video_path, output_path)
        print(f"  [B-ROLL CACHE] Salvo em cache: {cache_key}.mp4")
        
        return output_path.exists() and output_path.stat().st_size > 1024
    except Exception as e:
        print(f"  [WARN] B-ROLL error: {e}")
        return False

# --- Pydantic Schema para Chamadas Estruturadas do Gemini ------------
class ClipSegmentModel(BaseModel):
    start: float = Field(..., description="Tempo de início do segmento em segundos")
    end: float = Field(..., description="Tempo de término do segmento em segundos")
    viral_hook: str = Field(..., description="Descrição resumida do gancho viral")
    caption: str = Field(..., description="Legenda chamativa e curta em português")

class ClipListModel(BaseModel):
    segments: list[ClipSegmentModel]

class SceneScriptModel(BaseModel):
    scene_index: int = Field(..., description="Índice da cena (começando em 0)")
    scene_description: str = Field(..., description="Descrição visual do que acontece na cena")
    duration: float = Field(..., description="Duração da cena em segundos (aprox 6.0)")
    caption: str = Field(..., description="Legenda em português brasileiro para a cena")
    visual_prompt: str = Field(..., description="Visual prompt em inglês com 3 palavras-chave separadas por vírgula para buscar vídeos B-roll")
    character_ref: Optional[str] = Field(None, description="Descrição do personagem principal")

class StudioScriptModel(BaseModel):
    scenes: list[SceneScriptModel]

# --- Gemini API Call Wrapper ----------------------------------------
def _call_gemini_json(
    prompt: str,
    system_prompt: str,
    response_schema: type[BaseModel],
    temperature: float = 0.7,
    contents: list | None = None,
) -> dict:
    """Realiza chamada de geração de conteúdo estruturado via google-genai SDK."""
    client = get_gemini_client()
    if client is None:
        # --- MODO SIMULADO ---
        print(f"  [SIMULATED] Gemini ({GEMINI_MODEL}): {prompt[:60].strip()}")
        time.sleep(0.8)
        if response_schema == ClipListModel:
            return {
                "segments": [
                    {"start": 12.0, "end": 27.5,
                     "viral_hook": "Gancho de abertura com revelação intrigante",
                     "caption": "Você com certeza não sabia disso! "},
                    {"start": 35.0, "end": 50.0,
                     "viral_hook": "Dica prática inovadora e surpreendente",
                     "caption": "Isso vai economizar horas do seu dia! "},
                    {"start": 62.0, "end": 78.0,
                     "viral_hook": "Call to action final com grande apelo",
                     "caption": "Gostou? Salve este vídeo para não esquecer! "},
                ]
            }
        else:
            return {
                "scenes": [
                    {"scene_index": 0, "scene_description": "Close-up focado com iluminação futurista",
                     "duration": 6.0, "caption": "Isto vai revolucionar sua produtividade! ",
                     "visual_prompt": "productivity neon work, cinematic close-up, cyberpunk office",
                     "character_ref": "Programador jovem estiloso"},
                    {"scene_index": 1, "scene_description": "Animação de relógio correndo rápido",
                     "duration": 6.0, "caption": "O método de 25 minutos que muda tudo. ",
                     "visual_prompt": "glowing clock timer, fast motion, neon fuchsia colors",
                     "character_ref": "Relógio Pomodoro na tela"},
                    {"scene_index": 2, "scene_description": "Digitação ultra rápida no teclado mecânico",
                     "duration": 6.0, "caption": "Foco total, sem distrações no celular. ",
                     "visual_prompt": "typing mechanical keyboard close-up, glowing RGB lights",
                     "character_ref": "Mãos digitando rapidamente"},
                    {"scene_index": 3, "scene_description": "Pessoa descansando tomando café",
                     "duration": 6.0, "caption": "Pausa de 5 minutos para recarregar as energias. ",
                     "visual_prompt": "taking break drinking coffee, warm lighting, smiling developer",
                     "character_ref": "Programador jovem estiloso"},
                    {"scene_index": 4, "scene_description": "Olhando para câmera sorrindo e apontando",
                     "duration": 6.0, "caption": "Me segue para mais dicas de vibe coding! ",
                     "visual_prompt": "smiling developer pointing at camera, clean blurred background, neon glow",
                     "character_ref": "Programador jovem estiloso"},
                ]
            }

    try:
        contents_to_send = contents if contents is not None else prompt
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=contents_to_send,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=temperature,
                response_mime_type="application/json",
                response_schema=response_schema,
            ),
        )
        return json.loads(response.text.strip())
    except Exception as e:
        print(f"  [GEMINI ERROR] Falha ao invocar Gemini: {e}")
        raise HTTPException(status_code=500, detail=f"Erro na API Gemini: {str(e)}")

# --- YouTube Transcription Extractor ---------------------------------
def _get_youtube_data_and_transcript(url: str, temp_dir: Path) -> str:
    """Tenta obter metadados e legendas (transcrição) do vídeo do YouTube."""
    info_text = ""
    try:
        res = subprocess.run(
            ["yt-dlp", "--print", "title: %(title)s\ndescription: %(description)s", "--no-playlist", url],
            capture_output=True, text=True, timeout=30, check=True
        )
        info_text += res.stdout + "\n\n"
    except Exception as e:
        print(f"  [WARN] Falha ao extrair metadados do YouTube: {e}")
        info_text += f"URL do Vídeo: {url}\n\n"

    try:
        sub_prefix = temp_dir / "sub_temp"
        subprocess.run(
            [
                "yt-dlp",
                "--write-auto-subs",
                "--write-subs",
                "--sub-lang", "pt,en",
                "--skip-download",
                "--ignore-errors",
                "--output", str(sub_prefix),
                url
            ],
            capture_output=True, text=True, timeout=30
        )
        
        sub_files = list(temp_dir.glob("sub_temp.*.vtt")) or list(temp_dir.glob("sub_temp.*.srt"))
        if sub_files:
            sub_file = sub_files[0]
            with open(sub_file, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            
            clean_lines = []
            for line in content.splitlines():
                line = line.strip()
                if not line or line.startswith("WEBVTT") or line.startswith("Kind:") or line.startswith("Language:") or "-->" in line or line.isdigit():
                    continue
                line = re.sub(r"<[^>]+>", "", line)
                if not clean_lines or clean_lines[-1] != line:
                    clean_lines.append(line)
            
            transcript = " ".join(clean_lines[:1500])
            info_text += "TRANSCRIÇÃO DO VÍDEO:\n" + transcript
            print(f"  [OK] Transcrição extraída das legendas: {len(transcript)} caracteres")
        else:
            print("  [WARN] Nenhuma legenda automática encontrada.")
    except Exception as e:
        print(f"  [WARN] Falha ao extrair legendas do YouTube: {e}")

    return info_text

# --- FFmpeg Synthesized Audio/Video Engines --------------------------
AVAILABLE_VOICES = [
    # 🇧🇷 Português
    "pt-BR-AntonioNeural",
    "pt-BR-FranciscaNeural",
    "pt-BR-ThalitaNeural",
    "pt-BR-BrendaNeural",
    "pt-BR-DonatoNeural",
    "pt-BR-FabioNeural",
    "pt-BR-JulioNeural",
    "pt-BR-LeilaNeural",
    # 🇺🇸 Inglês
    "en-US-JennyNeural",
    "en-US-GuyNeural",
    "en-US-AriaNeural",
    "en-GB-SoniaNeural",
    "en-GB-RyanNeural",
    # 🇪🇸 Espanhol
    "es-ES-ElviraNeural",
    "es-ES-AlvaroNeural",
    "es-MX-DaliaNeural",
]

def _resolve_voice(voice: str | None) -> str:
    """Retorna o ID da voz Edge TTS, com fallback para a padrão."""
    if voice and voice in AVAILABLE_VOICES:
        return voice
    return "pt-BR-AntonioNeural"

async def _generate_scene_audio(text: str, output_path: Path, voice: str | None = None) -> bool:
    """Gera áudio de narração TTS usando Edge TTS (grátis)."""
    try:
        import edge_tts
        voice_id = _resolve_voice(voice)
        communicate = edge_tts.Communicate(text, voice_id)
        await communicate.save(str(output_path))
        return output_path.exists() and output_path.stat().st_size > 500
    except Exception as e:
        print(f"  [WARN] TTS error: {e}")
        return False

def _generate_background_music(output_path: Path, duration: float = 30.0) -> bool:
    """Gera trilha sonora ambiente royalty-free via FFmpeg sine wave mix."""
    try:
        duration = max(duration, 5.0)
        cmd = [
            "-f", "lavfi", "-i", f"sine=frequency=55:duration={duration}",           # Bass drone A1
            "-f", "lavfi", "-i", f"sine=frequency=110:duration={duration}",          # A2
            "-f", "lavfi", "-i", f"sine=frequency=130.81:duration={duration}",       # C3
            "-f", "lavfi", "-i", f"sine=frequency=164.81:duration={duration}",       # E3
            "-f", "lavfi", "-i", f"anoisesrc=d={duration}:c=white:r=44100:a=0.002", # Shimmer sutil
            "-filter_complex",
            "[1:a][2:a][3:a]amix=inputs=3:duration=first,volume=0.35[chord];"
            "[0:a]volume=0.4[base];"
            "[base][chord]amix=inputs=2:duration=first[pad];"
            "[pad][4:a]amix=inputs=2:duration=first,lowpass=f=500,volume=0.45[music];"
            "[music]afade=t=in:d=2,afade=t=out:st={}:d=3[out]"
            "".format(duration - 3),
            "-ac", "2",
            "-ar", "44100",
            "-sample_fmt", "s16",
            "-y", str(output_path),
        ]
        ret, _, _ = run_ffmpeg(cmd, timeout=60)
        success = ret == 0 and output_path.exists() and output_path.stat().st_size > 0
        if not success:
            output_path.unlink(missing_ok=True)
        return success
    except Exception as e:
        print(f"  [WARN] BGM error: {e}")
        output_path.unlink(missing_ok=True)
        return False

def _ensure_bgm_exists(bgm_path: Path, duration: float = 60.0) -> bool:
    """Garante que a trilha de BGM existe e possui tamanho maior que zero."""
    if bgm_path.exists():
        if bgm_path.stat().st_size == 0:
            print(f"  [BGM] Removendo arquivo corrompido de 0 bytes em {bgm_path}")
            bgm_path.unlink(missing_ok=True)
        else:
            return True
    print(f"  [BGM] Gerando nova trilha de música de fundo ({duration}s)...")
    return _generate_background_music(bgm_path, duration)

def _generate_cta_outro(output_path: Path, text: str, font_path: str) -> bool:
    """Gera vídeo de CTA de 3 segundos com fade e sino sintetizado."""
    try:
        drawtext_filter = ""
        if font_path:
            # CTA outro padrão usa a formatação com quebra de linha de até 25 caracteres
            wrapped_text = wrap_text(text, max_chars=25)
            escaped_txt = wrapped_text.replace(chr(39), "").replace(':', '')
            safe_font_path = font_path.replace(':', '\\:')
            drawtext_filter = (
                f",drawtext=text='{escaped_txt}':fontfile='{safe_font_path}':"
                f"fontsize=64:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:"
                f"shadowcolor=black@0.6:shadowx=4:shadowy=4"
            )
        
        # Gera o clipe em 30 FPS e áudio estéreo com sino senoidal em C5 (523.25 Hz)
        cmd = [
            "-f", "lavfi", "-i", "color=c=#0f172a:s=1080x1920:d=3:r=30",
            "-f", "lavfi", "-i", "sine=frequency=523.25:duration=3",
            "-filter_complex",
            f"[0:v]scale=1080:1920{drawtext_filter},fade=t=in:st=0:d=0.5,fade=t=out:st=2.5:d=0.5[vout];"
            "[1:a]volume=0.25,afade=t=in:d=0.1,afade=t=out:st=2.4:d=0.6,aformat=sample_rates=44100:channel_layouts=stereo[aout]",
            "-map", "[vout]",
            "-map", "[aout]",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "28",
            "-c:a", "aac",
            "-pix_fmt", "yuv420p",
            "-y", str(output_path)
        ]
        ret, _, _ = run_ffmpeg(cmd, timeout=30)
        return ret == 0 and output_path.exists()
    except Exception as e:
        print(f"  [WARN] Falha ao gerar CTA outro: {e}")
        return False

# --- Gemini Imagen - Geração de Imagens para Cenas -----------------
def _generate_scene_image_gemini(visual_prompt: str, output_path: Path) -> bool:
    """Gera uma imagem para a cena usando Gemini Imagen.
    
    Usa aspect_ratio 9:16 (vertical) e converte para RGB antes de salvar
    como JPEG para evitar artefatos de canal alpha (fundo vermelho).
    """
    client = get_gemini_client()
    if client is None:
        return False
    try:
        print(f"  [IMAGEN] Gerando imagem para: {visual_prompt[:60]}...")
        response = client.models.generate_images(
            model='imagen-3.0-generate-002',
            prompt=visual_prompt,
            config=types.GenerateImageConfig(
                number_of_images=1,
                aspect_ratio='9:16',
            ),
        )
        if response.generated_images:
            img = response.generated_images[0].image
            # ── Garantir modo RGB (JPEG não suporta alpha/transparência) ──
            # O canal alpha em RGBA pode causar artefatos vermelhos ao salvar
            # como JPEG. Converter explicitamente para RGB evita isso.
            if hasattr(img, 'mode'):
                if img.mode == 'RGBA':
                    # Criar fundo preto e mesclar canal alpha
                    bg = Image.new('RGB', img.size, (0, 0, 0))
                    bg.paste(img, mask=img.split()[3])
                    img = bg
                elif img.mode != 'RGB':
                    img = img.convert('RGB')
            else:
                # Se não for PIL Image, tentar converter
                try:
                    if hasattr(img, 'image_bytes'):
                        img = Image.open(io.BytesIO(img.image_bytes))
                        if img.mode != 'RGB':
                            img = img.convert('RGB')
                except Exception:
                    pass
            
            img.save(str(output_path), 'JPEG', quality=92)
            success = output_path.exists() and output_path.stat().st_size > 1024
            if success:
                print(f"  [IMAGEN] OK: {output_path.name} ({output_path.stat().st_size/1024:.0f}KB, {img.size[0]}x{img.size[1]})")
            else:
                print(f"  [IMAGEN] ARQUIVO INVÁLIDO: {output_path}")
            return success
        print(f"  [IMAGEN] Nenhuma imagem na resposta")
        return False
    except Exception as e:
        print(f"  [WARN] Gemini Imagen error: {e}")
        traceback.print_exc()
        return False

def _create_kenburns_video(image_path: Path, output_path: Path, duration: float) -> bool:
    """Cria um vídeo a partir de uma imagem estática com efeito Ken Burns (zoom suave).
    
    Para imagens 9:16 (retrato), usa scale proporcional à altura.
    Para imagens paisagem ou quadradas, usa scale proporcional à largura.
    """
    try:
        duration = max(duration, 3.0)
        fps = 30
        frames = int(duration * fps)
        
        # Detectar orientação da imagem para escolher a escala correta
        with Image.open(image_path) as img_check:
            w, h = img_check.size
            is_portrait = h > w
        
        if is_portrait:
            # Imagem retrato (9:16): escalar altura para 1920, largura será >= 1080
            # zoompan depois corta 1080x1920 do centro com zoom suave
            scale_expr = f"scale=-1:1920"
        else:
            # Imagem paisagem ou quadrada: escalar largura para 1920, altura >= 1920
            scale_expr = f"scale=1920:-2"
        
        # zoompan: centro dinâmico com zoom de 1.0 → 1.10 (10%)
        # x e y centrados para evitar deslocamento indesejado
        cmd = [
            "-loop", "1",
            "-i", str(image_path),
            "-vf",
            f"{scale_expr}:force_original_aspect_ratio=increase,"
            f"zoompan=z='min(zoom+0.0025,1.10)':"
            f"x='iw/2-(iw/zoom/2)':"
            f"y='ih/2-(ih/zoom/2)':"
            f"d={frames}:s=1080x1920:fps={fps},"
            f"fade=t=in:st=0:d=0.5:color=black,fade=t=out:st={duration-0.5}:d=0.5:color=black",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "35",
            "-pix_fmt", "yuv420p",
            "-t", str(duration),
            "-y", str(output_path),
        ]
        ret, _, stderr = run_ffmpeg(cmd, timeout=60)
        if ret != 0 or not output_path.exists():
            print(f"  [WARN] KenBurns fallback: {stderr[:200]}")
            # Fallback: imagem estática simples com pad preto
            cmd = [
                "-loop", "1",
                "-i", str(image_path),
                "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,fps=30",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "28",
                "-pix_fmt", "yuv420p",
                "-t", str(duration),
                "-y", str(output_path),
            ]
            ret, _, _ = run_ffmpeg(cmd, timeout=30)
        return ret == 0 and output_path.exists()
    except Exception as e:
        print(f"  [WARN] KenBurns error: {e}")
        return False

# --- Gemini Veo - Geração de Vídeos por IA -------------------------
def _generate_video_veo(prompt: str, output_path: Path, max_retries: int = 3) -> bool:
    """
    Gera um vídeo curto usando Gemini Veo 3.1.
    Veo usa predict_long_running (operação assíncrona).
    """
    client = get_gemini_client()
    if client is None:
        return False

    for attempt in range(max_retries):
        try:
            print(f"  [VEO] Gerando vídeo (tentativa {attempt+1}): {prompt[:60]}...")
            operation = client.models.predict_long_running(
                model="veo-3.1-fast-generate-preview",
                input=types.GenerateVideoRequest(
                    prompt=prompt,
                )
            )
            
            # Aguarda até 5 minutos pela conclusão
            print(f"  [VEO] Aguardando geração...")
            response = operation.result(timeout=300)
            
            # Tentar extrair vídeo da resposta
            if hasattr(response, 'generated_videos') and response.generated_videos:
                video = response.generated_videos[0]
                if hasattr(video, 'video') and hasattr(video.video, 'save'):
                    video.video.save(str(output_path))
                    if output_path.exists() and output_path.stat().st_size > 1024:
                        print(f"  [VEO] Vídeo salvo: {output_path.name} ({output_path.stat().st_size/1024:.0f}KB)")
                        return True
            
            # Fallback: verificar se há URI
            if hasattr(response, 'uri') or hasattr(response, 'video_uri'):
                uri = getattr(response, 'uri', getattr(response, 'video_uri', None))
                if uri:
                    print(f"  [VEO] Vídeo gerado em URI: {uri}")
                    # Tentar download do URI se for HTTP
                    if str(uri).startswith('http'):
                        r = http_req.get(uri, timeout=60)
                        if r.status_code == 200:
                            with open(output_path, 'wb') as f:
                                f.write(r.content)
                            if output_path.stat().st_size > 1024:
                                return True
            
            print(f"  [VEO] Resposta sem vídeo, tentando novamente...")
        except Exception as e:
            print(f"  [VEO] Erro (tentativa {attempt+1}): {str(e)[:150]}")
            time.sleep(2)
    
    return False

def process_veo_generation_job(job_id: str, project_id: str, video_prompts: list[dict], transition_duration: float = 0.5, transition_type: str = "fade"):
    """Tarefa em segundo plano para gerar 3 vídeos Veo e concatená-los."""
    job_dir = OUTPUT_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    project_dir = OUTPUT_DIR / project_id
    project_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        n_videos = len(video_prompts)
        video_paths = []
        
        # 1. Gerar cada vídeo via Veo
        for i, vp in enumerate(video_prompts):
            progress_percent = 10 + int((i / n_videos) * 70)
            jobs[job_id]["progress"] = progress_percent
            jobs[job_id]["status"] = f"Gerando vídeo {i+1} de {n_videos}..."
            print(f"  [VEO JOB {job_id}] Gerando vídeo {i+1}/{n_videos}")
            
            video_path = job_dir / f"veo_{i:03d}.mp4"
            prompt = vp.get("veo_prompt", vp.get("caption", ""))
            
            success = _generate_video_veo(prompt, video_path)
            
            if success and video_path.exists():
                video_paths.append(str(video_path))
                print(f"  [VEO JOB {job_id}] Vídeo {i+1} OK")
            else:
                # Fallback: gerar imagem via Imagen + Ken Burns
                print(f"  [VEO JOB {job_id}] Veo falhou, fallback para Imagen...")
                fallback_img = job_dir / f"fallback_{i:03d}.jpg"
                fallback_vid = job_dir / f"fallback_{i:03d}.mp4"
                if _generate_scene_image_gemini(prompt, fallback_img):
                    if _create_kenburns_video(fallback_img, fallback_vid, 10.0):
                        video_paths.append(str(fallback_vid))
        
        if not video_paths:
            raise ValueError("Nenhum vídeo foi gerado com sucesso.")
        
        # 2. Normalizar todos os vídeos para mesmos parâmetros
        jobs[job_id]["progress"] = 80
        jobs[job_id]["status"] = "Normalizando vídeos..."
        print(f"  [VEO JOB {job_id}] Normalizando {len(video_paths)} vídeos...")
        
        normalized = []
        for i, vp in enumerate(video_paths):
            norm_path = job_dir / f"normalized_{i:03d}.mp4"
            ret, _, _ = run_ffmpeg([
                "-i", vp,
                "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,fps=30",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "35",
                "-c:a", "aac",
                "-ar", "44100",
                "-ac", "2",
                "-pix_fmt", "yuv420p",
                "-y", str(norm_path),
            ])
            if ret == 0 and norm_path.exists():
                normalized.append(str(norm_path))
        
        if not normalized:
            raise ValueError("Falha ao normalizar vídeos.")
        
        # 3. Concatenar vídeos com transições suaves
        fade_dur = max(0.3, min(1.0, transition_duration))
        jobs[job_id]["progress"] = 90
        jobs[job_id]["status"] = "Concatenando vídeos..."
        print(f"  [VEO JOB {job_id}] Concatenando vídeos com crossfade ({fade_dur}s)...")
        
        final_path = job_dir / "final.mp4"
        if not _concat_with_xfade(normalized, final_path, fade_duration=fade_dur, transition=transition_type):
            raise ValueError("Falha na concatenação com crossfade.")
        
        # 4. Copiar para o diretório do projeto
        project_final = project_dir / "final.mp4"
        shutil.copy2(final_path, project_final)
        
        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["output_path"] = str(final_path)
        print(f"  [VEO JOB {job_id}] CONCLUÍDO! Vídeo em: {final_path}")
        
        if project_id in jobs:
            jobs[project_id]["status"] = "done"
            jobs[project_id]["progress"] = 100
            jobs[project_id]["output_path"] = str(final_path)
            jobs[project_id]["video_paths"] = video_paths
            
    except Exception as e:
        print(f"  [VEO JOB ERROR {job_id}] {e}")
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        jobs[job_id]["progress"] = 0
        if project_id in jobs:
            jobs[project_id]["status"] = "error"
            jobs[project_id]["error"] = str(e)

# --- Concatenação com Transição Suave (xfade) -----------------------
def _concat_simple(video_paths: list[str], output_path: Path) -> bool:
    """Concatena vídeos sem transição (cópia de streams) — fallback."""
    try:
        list_file = output_path.parent / "_xfade_concat_list.txt"
        with open(list_file, "w") as f:
            for vp in video_paths:
                f.write(f"file '{Path(vp).as_posix()}'\n")
        ret, _, stderr = run_ffmpeg([
            "-f", "concat",
            "-safe", "0",
            "-i", str(list_file),
            "-c", "copy",
            "-y", str(output_path),
        ])
        list_file.unlink(missing_ok=True)
        return ret == 0 and output_path.exists()
    except Exception as e:
        print(f"  [WARN] _concat_simple error: {e}")
        return False

def _concat_with_xfade(
    video_paths: list[str],
    output_path: Path,
    fade_duration: float = 0.5,
    transition: str = "fade",
) -> bool:
    """
    Concatena múltiplos vídeos com transição suave (xfade + acrossfade).
    Usa crossfade para transições cinematográficas entre clipes.
    Se falhar, faz fallback para concatenação simples.
    """
    n = len(video_paths)
    if n == 0:
        return False
    if n == 1:
        shutil.copy2(video_paths[0], str(output_path))
        return output_path.exists()

    try:
        # Construir inputs
        cmd = []
        for vp in video_paths:
            cmd += ["-i", vp]

        # Obter durações para calcular offsets
        durations = []
        for vp in video_paths:
            d = _get_video_duration(Path(vp))
            durations.append(max(d, 3.0))

        # Construir filter_complex para xfade (vídeo) + acrossfade (áudio)
        filter_parts = []
        prev_label_v = "0:v"
        prev_label_a = "0:a"

        for i in range(1, n):
            # offset = soma das durações anteriores - i * fade_duration
            offset = sum(durations[:i]) - i * fade_duration
            offset = max(offset, 0.0)

            v_label = f"v{i:02d}"
            filter_parts.append(
                f"[{prev_label_v}][{i}:v]xfade=transition={transition}:duration={fade_duration}:offset={offset:.3f}[{v_label}]"
            )
            prev_label_v = v_label

            a_label = f"a{i:02d}"
            filter_parts.append(
                f"[{prev_label_a}][{i}:a]acrossfade=d={fade_duration}:c1=tri:c2=tri[{a_label}]"
            )
            prev_label_a = a_label

        filter_complex = ";".join(filter_parts)

        cmd += [
            "-filter_complex", filter_complex,
            "-map", f"[{prev_label_v}]",
            "-map", f"[{prev_label_a}]",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "35",
            "-c:a", "aac",
            "-ar", "44100",
            "-ac", "2",
            "-pix_fmt", "yuv420p",
            "-y", str(output_path),
        ]

        ret, _, stderr = run_ffmpeg(cmd, timeout=300)
        if ret != 0 or not output_path.exists():
            print(f"  [WARN] xfade concat falhou, tentando fallback: {stderr[:200]}")
            return _concat_simple(video_paths, output_path)
        print(f"  [XFD] Crossfade concat OK — {n} vídeos em {output_path.name}")
        return True
    except Exception as e:
        print(f"  [WARN] _concat_with_xfade error: {e}")
        return _concat_simple(video_paths, output_path)

# --- Cores por Cena para Gradiente de Fallback -----------------------
SCENE_COLORS = [
    ("#020617", "#1e1b4b"),  # Cena 0: Slate Dark / Indigo
    ("#1e1b4b", "#311042"),  # Cena 1: Indigo / Violet
    ("#311042", "#4a044e"),  # Cena 2: Violet / Fuchsia
    ("#4a044e", "#581c87"),  # Cena 3: Fuchsia / Purple
    ("#581c87", "#020617"),  # Cena 4: Purple / Slate Dark
]

def _generate_scene_video(
    output_path: Path,
    caption: str,
    duration: float,
    scene_index: int,
    broll_path: Path | None = None,
    audio_path: Path | None = None,
    subtitle_options: SubtitleOptions | None = None,
    temp_txt_path: Path | None = None,
) -> None:
    """Gera o vídeo de uma cena usando FFmpeg aplicando filtros anti-reuso e legendas customizadas."""
    duration = max(duration, 3.0)
    color1, color2 = SCENE_COLORS[scene_index % len(SCENE_COLORS)]
    
    # Filtro de Legenda (drawtext) dinâmico com wrap
    drawtext_filter = ""
    if SYSTEM_FONT and caption:
        drawtext_filter = _build_drawtext_filter(
            text=caption,
            font_path=SYSTEM_FONT,
            subtitle_options=subtitle_options,
            temp_txt_path=temp_txt_path
        )
    
    temp_video = output_path.with_suffix(".tmp.mp4")
    
    # 1. Pipeline de Efeitos de Vídeo:
    scale_pad_fps = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,fps=30"
    visual_polish = "vignette=angle=0.12,noise=alls=5:allf=t+u,eq=contrast=1.03:saturation=1.05"
    
    vf = f"{scale_pad_fps},{visual_polish}"
    
    # Efeito de gancho de abertura na cena 0
    if scene_index == 0:
        vf += ",fade=t=in:st=0:d=1.5:color=white"
        
    if drawtext_filter:
        vf += f",{drawtext_filter}"
        
    if broll_path and broll_path.exists():
        # Usa vídeo B-roll como fundo
        ret, _, _ = run_ffmpeg([
            "-stream_loop", "-1",
            "-i", str(broll_path),
            "-t", str(duration),
            "-vf", vf,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "28",
            "-pix_fmt", "yuv420p",
            "-an",
            str(temp_video),
        ])
    else:
        # Fallback: Gradiente/Cor Sólida Animada
        grad_filter = f"color=c={color1}:s=1080x1920:d={duration}:r=30,{vf}"
        ret, _, _ = run_ffmpeg([
            "-f", "lavfi",
            "-i", grad_filter,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "28",
            "-pix_fmt", "yuv420p",
            "-an",
            str(temp_video),
        ])
    
    if ret != 0 or not temp_video.exists():
        print("  [WARN] Erro ao renderizar cena, gerando fallback simples")
        run_ffmpeg([
            "-f", "lavfi",
            "-i", f"color=c={color1}:s=1080x1920:d={duration}:r=30,fps=30",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "28",
            "-pix_fmt", "yuv420p",
            str(temp_video),
        ])
    
    # Mixar áudio com o vídeo da cena
    if audio_path and audio_path.exists():
        run_ffmpeg([
            "-i", str(temp_video),
            "-i", str(audio_path),
            "-c:v", "copy",
            "-c:a", "aac",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            "-y",
            str(output_path),
        ])
        temp_video.unlink(missing_ok=True)
    else:
        # Se não há áudio, cria uma faixa silenciada estéreo de 44100Hz para concatenação uniforme
        run_ffmpeg([
            "-i", str(temp_video),
            "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
            "-c:v", "copy",
            "-c:a", "aac",
            "-t", str(duration),
            "-y",
            str(output_path),
        ])
        temp_video.unlink(missing_ok=True)

# --- API Routes ------------------------------------------------------
@app.get("/api/health")
async def health():
    return HealthResponse(
        status="ok",
        version="1.2.0",
        ffmpeg_available=True,
        gemini_configured=GEMINI_API_KEY != "",
    )

@app.post("/api/clip/extract")
async def clip_extract(req: ClipExtractRequest):
    """
    Baixa vídeo do YouTube, envia transcrição/áudio para o Gemini 3.5 Flash,
    identifica ganchos virais e corta/edita com efeitos anti-reuso via FFmpeg.
    """
    job_id = f"clip-{uuid.uuid4().hex[:8]}"
    jobs[job_id] = {"status": "downloading", "progress": 10}

    # Timeout global de 4 minutos para todo o processo
    try:
        return await asyncio.wait_for(
            _clip_extract_internal(req, job_id),
            timeout=240.0
        )
    except asyncio.TimeoutError:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = "Tempo limite excedido (4 min). O vídeo pode ser muito longo ou o YouTube bloqueou o download."
        jobs[job_id]["progress"] = 0
        print(f"  [ERROR] clip_extract TIMEOUT após 4 minutos para job {job_id}")
        return ClipExtractResponse(
            success=False,
            job_id=job_id,
            error="Tempo limite excedido (4 min). Tente um vídeo mais curto."
        )
    except HTTPException:
        raise
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        print(f"  [ERROR] clip_extract: {e}")
        return ClipExtractResponse(success=False, job_id=job_id, error=str(e))

async def _clip_extract_internal(req: ClipExtractRequest, job_id: str):
    """Lógica interna de clipping encapsulada para timeout global."""
    temp_dir = OUTPUT_DIR / job_id
    temp_dir.mkdir(parents=True, exist_ok=True)
    video_path = temp_dir / "source.mp4"

    # 1. Download do vídeo original via yt-dlp (com retry)
    print(f"  [CLIPPING] Baixando vídeo: {req.youtube_url}")
    jobs[job_id]["progress"] = 20
    
    yt_dlp_cmd = [
        "yt-dlp", "-f", "best[height<=720]", "-o", str(video_path),
        "--no-playlist", "--quiet",
        "--extractor-retries", "3",
        "--retries", "3",
        "--sleep-requests", "5.0",
        "--sleep-interval", "5.0",
        "--max-sleep-interval", "15.0",
        req.youtube_url,
    ]
    
    max_attempts = 3
    last_error = None
    for attempt in range(max_attempts):
        if attempt > 0:
            wait_time = 10 * attempt
            print(f"  [CLIPPING] Tentativa {attempt+1}/{max_attempts} após {wait_time}s...")
            await asyncio.sleep(wait_time)
        try:
            result = subprocess.run(
                yt_dlp_cmd,
                capture_output=True, text=True, timeout=180, check=False,
            )
            if result.returncode == 0:
                last_error = None
                break
            last_error = result.stderr[:300] if result.stderr else f"yt-dlp exit code {result.returncode}"
            print(f"  [CLIPPING] Tentativa {attempt+1} falhou: {last_error}")
        except subprocess.TimeoutExpired:
            last_error = "Download excedeu 3 minutos"
            print(f"  [CLIPPING] Tentativa {attempt+1} timeout")
        except Exception as e:
            last_error = str(e)[:200]
            print(f"  [CLIPPING] Tentativa {attempt+1} erro: {last_error}")
    
    if last_error:
        raise HTTPException(status_code=400, detail=f"Falha ao baixar vídeo: {last_error}")
    if not video_path.exists():
        raise HTTPException(status_code=500, detail="Falha ao baixar vídeo do YouTube")

    if not video_path.exists():
        raise HTTPException(status_code=500, detail="Falha ao baixar vídeo do YouTube")

    jobs[job_id]["status"] = "analyzing"
    jobs[job_id]["progress"] = 45

    # 2. Obter metadados + legendas
    transcript = _get_youtube_data_and_transcript(req.youtube_url, temp_dir)
    client = get_gemini_client()

    # Determinar estratégia de análise da IA
    if client:
        if "TRANSCRIÇÃO DO VÍDEO:" in transcript and len(transcript) > 250:
            print("  [CLIPPING] Usando transcrição em texto estruturado com Gemini 3.5 Flash")
            prompt = (
                f"Analise o seguinte vídeo do YouTube através do seu título, descrição e transcrição:\n\n"
                f"{transcript}\n\n"
                f"Identifique os 3 a 5 melhores ganchos virais para criar Shorts de 15 a 60 segundos de duração."
            )
            segments_data = _call_gemini_json(
                prompt=prompt,
                system_prompt="Você é um especialista em reter público no TikTok/YouTube Shorts. Identifique os pontos mais chamativos do vídeo.",
                response_schema=ClipListModel
            )
        else:
            # Fallback multimodal: Envia áudio real do vídeo para o Gemini transcrever/analisar
            print("  [CLIPPING] Nenhuma legenda encontrada. Enviando áudio multimodal para o Gemini...")
            audio_path = temp_dir / "audio_extracted.mp3"
            # Extrai áudio leve (mono, 32kbps)
            subprocess.run([
                "ffmpeg", "-y", "-i", str(video_path),
                "-vn", "-acodec", "libmp3lame", "-ac", "1", "-ar", "16000", "-ab", "32k",
                str(audio_path)
            ], capture_output=True, timeout=30)

            if audio_path.exists() and audio_path.stat().st_size > 1024:
                print("  [CLIPPING] Uploading áudio para API Gemini...")
                gemini_file = client.files.upload(file=str(audio_path))
                
                # Aguarda upload e processamento
                time.sleep(3.0)
                
                prompt = "Analise o áudio deste vídeo e extraia os 3 a 5 momentos mais virais (ganchos de 15 a 60 segundos de duração) para transformar em Shorts verticais."
                try:
                    segments_data = _call_gemini_json(
                        prompt=prompt,
                        system_prompt="Você é um clipping expert que analisa áudios de podcasts e palestras para cortar melhores momentos virais.",
                        response_schema=ClipListModel,
                        contents=[gemini_file, prompt]
                    )
                finally:
                    try:
                        client.files.delete(name=gemini_file.name)
                    except Exception:
                        pass
            else:
                # Fallback de metadados
                prompt = f"Analise o seguinte vídeo pelos metadados:\n\n{transcript}\n\nIdentifique os ganchos prováveis."
                segments_data = _call_gemini_json(
                    prompt=prompt,
                    system_prompt="Extraia estimativas de melhores momentos baseados nos dados disponíveis.",
                    response_schema=ClipListModel
                )
    else:
        # Modo simulado sem API key: gera segmentos dinâmicos de acordo com a duração do vídeo
        video_duration = _get_video_duration(video_path) or 60.0
        if video_duration < 15.0:
            segments_list = [
                {"start": 0.0, "end": video_duration,
                 "viral_hook": "Abertura rápida e direta",
                 "caption": "Você precisa ver isso! "}
            ]
        else:
            clip_len = min(15.0, video_duration / 3.0)
            segments_list = [
                {"start": 0.0, "end": clip_len,
                 "viral_hook": "Abertura impactante com revelação curiosa",
                 "caption": "Você com certeza não sabia disso! "},
                {"start": clip_len, "end": clip_len * 2,
                 "viral_hook": "Revelação do mistério ou dica central",
                 "caption": "Isso vai economizar muito do seu tempo! "},
                {"start": clip_len * 2, "end": min(video_duration, clip_len * 3),
                 "viral_hook": "Fechamento dinâmico com incentivo a seguir",
                 "caption": "Gostou? Me segue para não perder nada! "},
            ]
        segments_data = {"segments": segments_list}

    segments_list = segments_data.get("segments", [])
    segments = []
    for s in segments_list:
        seg = ClipSegment(
            start=float(s["start"]),
            end=float(s["end"]),
            viral_hook=s.get("viral_hook", ""),
            caption=s.get("caption", ""),
        )
        segments.append(seg)

    if not segments:
        raise HTTPException(status_code=400, detail="Nenhum segmento viral identificado pela IA.")

    jobs[job_id]["segments"] = [s.model_dump() for s in segments]
    jobs[job_id]["status"] = "clipping"
    jobs[job_id]["progress"] = 60

    # 3. Cortar, Cropar (9:16) e Aplicar polimento anti-reuso
    clips_dir = temp_dir / "clips"
    clips_dir.mkdir(exist_ok=True)
    clip_paths = []

    # Gerar trilha sonora de fundo padrão
    bgm_path = OUTPUT_DIR / "_bgm.wav"
    if not bgm_path.exists():
        _generate_background_music(bgm_path, 60.0)

    for i, seg in enumerate(segments):
        clip_out = clips_dir / f"clip_{i:03d}.mp4"
        duration = seg.end - seg.start
        
        vf = "crop=ih*9/16:ih:(iw-ow)/2:0,scale=1080:1920,fps=30"
        vf += ",vignette=angle=0.12,noise=alls=5:allf=t+u,eq=contrast=1.03:saturation=1.05"
        
        if i == 0:
            vf += ",fade=t=in:st=0:d=1.5:color=white"
            
        temp_txt_path = clips_dir / f"caption_{i:03d}.txt"
        drawtext_filter = ""
        if SYSTEM_FONT and seg.caption:
            drawtext_filter = _build_drawtext_filter(
                text=seg.caption,
                font_path=SYSTEM_FONT,
                subtitle_options=req.subtitle_options,
                temp_txt_path=temp_txt_path
            )
            
        if drawtext_filter:
            vf += f",{drawtext_filter}"

        cmd = [
            "-ss", format_timestamp(seg.start),
            "-i", str(video_path),
        ]
        
        has_bgm = bgm_path.exists()
        if has_bgm:
            cmd += ["-i", str(bgm_path)]
            
        cmd += ["-t", format_timestamp(duration)]
        
        if has_bgm:
            cmd += [
                "-filter_complex",
                f"[0:v]{vf}[vout];"
                f"[0:a]volume=1.0[a0];[1:a]volume=0.08[a1];"
                f"[a0][a1]amix=inputs=2:duration=first[aout]",
                "-map", "[vout]",
                "-map", "[aout]"
            ]
        else:
            cmd += ["-vf", vf, "-c:a", "aac"]
            
        cmd += [
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "35",
            "-shortest",
            "-y", str(clip_out)
        ]
        
        ret, _, stderr = run_ffmpeg(cmd)
        if ret == 0 and clip_out.exists():
            clip_paths.append(str(clip_out))
        else:
            print(f"  [WARN] Falha ao cortar clipe {i}: {stderr[:200]}")

    if not clip_paths:
        raise HTTPException(status_code=500, detail="Nenhum clipe foi gerado com sucesso.")

    jobs[job_id]["progress"] = 85

    # 4. CTA e concatenação final
    cta_path = temp_dir / "cta_outro.mp4"
    _generate_cta_outro(cta_path, "Siga para mais!", SYSTEM_FONT)

    concat_path = temp_dir / "final.mp4"
    all_clips = list(clip_paths)
    if cta_path.exists():
        all_clips.append(str(cta_path))
    
    if not _concat_with_xfade(all_clips, concat_path, fade_duration=0.4):
        raise HTTPException(status_code=500, detail="Falha ao concatenar clipes.")

    jobs[job_id]["output_path"] = str(concat_path)
    jobs[job_id]["status"] = "done"
    jobs[job_id]["progress"] = 100

    return ClipExtractResponse(
        success=True,
        job_id=job_id,
        segments=segments,
        output_path=str(concat_path),
    )

@app.post("/api/clip/cancel/{job_id}")
async def clip_cancel(job_id: str):
    """Cancela um job de clipping em andamento."""
    try:
        job = get_job(job_id)
        if job.get("status") in ("done", "error", "cancelled"):
            return {"success": False, "error": "Job já finalizado ou cancelado"}
        
        job["status"] = "cancelled"
        job["progress"] = 0
        job["error"] = "Cancelado pelo usuário"
        
        # Tentar limpar diretório temporário
        temp_dir = OUTPUT_DIR / job_id
        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)
            
        print(f"  [CANCEL] Job {job_id} cancelado pelo usuário")
        return {"success": True, "job_id": job_id, "status": "cancelled"}
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/clip/status/{job_id}")
async def clip_status(job_id: str):
    job = get_job(job_id)
    return JobStatusResponse(
        status=job.get("status", "unknown"),
        progress=job.get("progress", 0),
        job_id=job_id,
        output_path=job.get("output_path"),
        error=job.get("error"),
    )

@app.get("/api/download/{job_id}")
async def download_video(job_id: str):
    job = get_job(job_id)
    output_path = job.get("output_path")
    if not output_path or not Path(output_path).exists():
        raise HTTPException(status_code=404, detail="Arquivo final não encontrado")
    return FileResponse(output_path, media_type="video/mp4", filename="shorts_studio.mp4")

@app.post("/api/publish/shorts")
async def publish_shorts(req: PublishShortsRequest):
    auth_url = f"https://accounts.google.com/o/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:8000/api/publish/callback&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload&state={req.job_id}"
    return {"auth_url": auth_url, "job_id": req.job_id, "title": req.title}

# --- Studio / "Do Zero" Routes ---------------------------------------
@app.post("/api/studio/script")
async def studio_script(req: StudioScriptRequest):
    """Gera roteiro com Gemini estruturado em cenas."""
    project_id = f"studio-{uuid.uuid4().hex[:8]}"
    visual_engine = req.visual_engine or "pexels"

    if visual_engine == "gemini_video":
        # ── MODO VEO: 3 prompts para geração de vídeos ──
        system_prompt = (
            "Você é um roteirista especialista em criar prompts para o Google Veo (geração de vídeos por IA).\n"
            "Crie 3 prompts de vídeo detalhados em INGLÊS sobre o tema solicitado.\n"
            "Cada prompt deve descrever uma cena cinematográfica de até 10 segundos.\n"
            "Seu retorno deve ser estritamente no formato do JSON definido pelo responseSchema: "
            "{\"video_prompts\": [{\"index\": 0, \"veo_prompt\": \"...\", \"caption\": \"...\"}, ...]}"
        )
        prompt = (
            f"Crie 3 prompts para geração de vídeos curtos (max 10s cada) sobre: {req.idea}\n\n"
            f"Cada prompt deve ser descritivo em inglês, incluindo:\n"
            f"- Estilo visual (cinematográfico, 4K, iluminação dramática)\n"
            f"- Movimento de câmera (slow pan, close-up, establishing shot)\n"
            f"- Ambiente e atmosfera\n"
            f"- Formato vertical 9:16 (1080x1920) para Shorts/TikTok"
        )
        
        try:
            client = get_gemini_client()
            if client is None:
                raise HTTPException(status_code=500, detail="Gemini não configurado.")
            
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.8,
                    response_mime_type="application/json",
                ),
            )
            scripts_data = json.loads(response.text.strip())
            video_prompts_raw = scripts_data.get("video_prompts", [])
            
            if not video_prompts_raw:
                raise HTTPException(status_code=500, detail="IA falhou em gerar prompts de vídeo.")
            
            video_prompts = []
            for i, vp in enumerate(video_prompts_raw):
                vid = VideoPrompt(
                    index=i,
                    veo_prompt=vp.get("veo_prompt", f"Video about {req.idea}"),
                    caption=vp.get("caption", ""),
                )
                video_prompts.append(vid)
            
            jobs[project_id] = {
                "status": "script_ready",
                "progress": 30,
                "video_prompts": [v.model_dump() for v in video_prompts],
                "visual_engine": "gemini_video",
            }
            
            return VideoScriptResponse(
                success=True,
                project_id=project_id,
                video_prompts=video_prompts,
            )
        except Exception as e:
            print(f"  [ERROR] studio_script (veo): {e}")
            return VideoScriptResponse(
                success=False,
                project_id=project_id,
                error=str(e),
            )
    else:
        # ── MODO PEXELS / GEMINI IMAGEN: 5 cenas ──
        system_prompt = (
            "Você é um roteirista experiente em redes sociais (TikTok e Shorts).\n"
            "Crie um roteiro de 30 segundos dividido em 5 cenas sequenciais (~6 segundos cada).\n"
            "Seu retorno deve ser estritamente no formato do JSON definido pelo responseSchema."
        )
        prompt = f"Crie um roteiro viral do zero sobre o seguinte tema: {req.idea}"

        try:
            scenes_data = _call_gemini_json(
                prompt=prompt,
                system_prompt=system_prompt,
                response_schema=StudioScriptModel
            )

            scenes_list = scenes_data.get("scenes", [])
            if not scenes_list:
                raise HTTPException(status_code=500, detail="IA falhou em gerar cenas do roteiro.")

            scenes = []
            for i, s in enumerate(scenes_list):
                scene = SceneScript(
                    scene_index=s.get("scene_index", i),
                    scene_description=s.get("scene_description", f"Cena {i+1}"),
                    duration=float(s.get("duration", 6.0)),
                    caption=s.get("caption", ""),
                    visual_prompt=s.get("visual_prompt", ""),
                    character_ref=s.get("character_ref"),
                )
                scenes.append(scene)

            jobs[project_id] = {
                "status": "script_ready",
                "progress": 30,
                "scenes": [s.model_dump() for s in scenes],
            }

            return StudioScriptResponse(
                success=True,
                project_id=project_id,
                scenes=scenes,
            )
        except Exception as e:
            print(f"  [ERROR] studio_script: {e}")
            return StudioScriptResponse(
                success=False,
                project_id=project_id,
                error=str(e),
            )

@app.post("/api/studio/generate-videos")
async def studio_generate_videos(req: GenerateVideosRequest, background_tasks: BackgroundTasks):
    """Inicia a geração de vídeos Veo em segundo plano."""
    job_id = f"veo-{uuid.uuid4().hex[:8]}"
    
    jobs[job_id] = {
        "status": "starting",
        "progress": 5,
        "project_id": req.project_id,
    }
    jobs[req.project_id] = jobs.get(req.project_id, {})
    jobs[req.project_id]["status"] = "generating_videos"
    jobs[req.project_id]["progress"] = 5
    
    fade_dur = req.transition_duration if req.transition_duration is not None else 0.5
    fade_dur = max(0.3, min(1.0, fade_dur))
    trans_type = req.transition_type if req.transition_type else "fade"
    background_tasks.add_task(
        process_veo_generation_job,
        job_id=job_id,
        project_id=req.project_id,
        video_prompts=[v.model_dump() for v in req.video_prompts],
        transition_duration=fade_dur,
        transition_type=trans_type,
    )
    
    return GenerateVideosResponse(
        success=True,
        job_id=job_id,
    )

@app.post("/api/studio/generate-scene")
async def studio_generate_scene(req: StudioSceneGenerateRequest):
    """Gera vídeo de uma cena do roteiro via FFmpeg + B-roll/TTS ou Imagem IA."""
    project_id = req.project_id
    scene_idx = req.scene_index
    visual_engine = req.visual_engine or "pexels"

    try:
        scene_dir = OUTPUT_DIR / project_id / "scenes"
        scene_dir.mkdir(parents=True, exist_ok=True)

        output_path = scene_dir / f"scene_{scene_idx:03d}.mp4"
        broll_path = scene_dir / f"broll_{scene_idx:03d}.mp4"
        broll_query = req.scene.visual_prompt or req.scene.scene_description

        has_broll = False

        if visual_engine == "gemini":
            # ── MODO GEMINI: gera imagem via Imagen + Ken Burns ──
            print(f"  [SCENE {scene_idx}] Modo Gemini: gerando imagem via Imagen...")
            imagen_path = scene_dir / f"imagen_{scene_idx:03d}.jpg"
            imagem_ok = _generate_scene_image_gemini(broll_query, imagen_path)

            if imagem_ok:
                print(f"  [SCENE {scene_idx}] Criando vídeo Ken Burns da imagem...")
                has_broll = _create_kenburns_video(imagen_path, broll_path, req.scene.duration)
            else:
                print(f"  [SCENE {scene_idx}] [WARN] Imagen falhou, usando fallback de gradiente")
        else:
            # ── MODO PEXELS: download de B-roll do Pexels ──
            print(f"  [SCENE {scene_idx}] Modo Pexels: baixando B-roll...")
            has_broll = _search_and_download_broll(broll_query, broll_path)

        # Narração TTS com voz selecionada
        audio_path = scene_dir / f"audio_{scene_idx:03d}.mp3"
        has_audio = await _generate_scene_audio(req.scene.caption, audio_path, voice=req.voice)

        # Renderizar vídeo da cena passando subtitle_options
        temp_txt_path = scene_dir / f"caption_{scene_idx:03d}.txt"
        _generate_scene_video(
            output_path=output_path,
            caption=req.scene.caption,
            duration=req.scene.duration,
            scene_index=scene_idx,
            broll_path=broll_path if has_broll else None,
            audio_path=audio_path if has_audio else None,
            subtitle_options=req.subtitle_options,
            temp_txt_path=temp_txt_path
        )

        if not output_path.exists():
            raise HTTPException(status_code=500, detail="Erro ao gerar vídeo da cena")

        if project_id in jobs:
            scenes = jobs[project_id].get("scenes_paths", [])
            if str(output_path) not in scenes:
                scenes.append(str(output_path))
            jobs[project_id]["scenes_paths"] = sorted(scenes)
            jobs[project_id]["progress"] = 40 + int((scene_idx + 1) / 5 * 50)

        # Informar no job qual engine foi usada
        jobs[project_id]["visual_engine"] = visual_engine

        return StudioGenerateResponse(
            success=True,
            scene_index=scene_idx,
            output_path=str(output_path),
        )
    except Exception as e:
        print(f"  [ERROR] studio_generate_scene: {e}")
        return StudioGenerateResponse(
            success=False,
            scene_index=scene_idx,
            error=str(e),
        )

# ── Geração Paralela de Todas as Cenas ──────────────────────
async def _generate_single_scene(
    project_id: str,
    scene_idx: int,
    scene_data: SceneScript,
    all_scenes: list[SceneScript],
    visual_engine: str,
    subtitle_options: SubtitleOptions | None,
    voice: str | None,
    semaphore: asyncio.Semaphore,
) -> dict:
    """Gera uma única cena (B-roll + TTS + FFmpeg) — usada pelo asyncio.gather()."""
    try:
        scene_dir = OUTPUT_DIR / project_id / "scenes"
        scene_dir.mkdir(parents=True, exist_ok=True)

        output_path = scene_dir / f"scene_{scene_idx:03d}.mp4"
        broll_path = scene_dir / f"broll_{scene_idx:03d}.mp4"
        broll_query = scene_data.visual_prompt or scene_data.scene_description

        has_broll = False

        # ── B-roll / Imagem (I/O bound — roda sem semáforo) ──
        if visual_engine == "gemini":
            print(f"  [PARALLEL SCENE {scene_idx}] Gemini Imagen...")
            imagen_path = scene_dir / f"imagen_{scene_idx:03d}.jpg"
            imagem_ok = _generate_scene_image_gemini(broll_query, imagen_path)
            if imagem_ok:
                has_broll = _create_kenburns_video(imagen_path, broll_path, scene_data.duration)
        else:
            print(f"  [PARALLEL SCENE {scene_idx}] Pexels B-roll...")
            has_broll = _search_and_download_broll(broll_query, broll_path)

        # ── TTS (I/O bound — roda sem semáforo) ──
        audio_path = scene_dir / f"audio_{scene_idx:03d}.mp3"
        has_audio = await _generate_scene_audio(scene_data.caption, audio_path, voice=voice)

        # ── FFmpeg render (CPU bound — usa semáforo para limitar concorrência) ──
        async with semaphore:
            print(f"  [PARALLEL SCENE {scene_idx}] Renderizando FFmpeg...")
            temp_txt_path = scene_dir / f"caption_{scene_idx:03d}.txt"
            _generate_scene_video(
                output_path=output_path,
                caption=scene_data.caption,
                duration=scene_data.duration,
                scene_index=scene_idx,
                broll_path=broll_path if has_broll else None,
                audio_path=audio_path if has_audio else None,
                subtitle_options=subtitle_options,
                temp_txt_path=temp_txt_path
            )

        success = output_path.exists()
        print(f"  [PARALLEL SCENE {scene_idx}] {'OK' if success else 'FALHOU'}")
        return {
            "scene_index": scene_idx,
            "success": success,
            "output_path": str(output_path) if success else None,
            "error": None if success else "Falha ao gerar cena",
        }
    except Exception as e:
        print(f"  [PARALLEL SCENE ERROR {scene_idx}] {e}")
        return {
            "scene_index": scene_idx,
            "success": False,
            "output_path": None,
            "error": str(e),
        }


@app.post("/api/studio/generate-all-scenes")
async def studio_generate_all_scenes(req: StudioGenerateAllRequest):
    """Gera TODAS as cenas em paralelo usando asyncio.gather().
    
    B-roll (Pexles/Gemini) e TTS rodam I/O bound em paralelo total.
    FFmpeg renders usam semáforo para limitar CPUs concorrentes.
    """
    project_id = req.project_id
    n_scenes = len(req.scenes)
    
    if n_scenes == 0:
        raise HTTPException(status_code=400, detail="Nenhuma cena para gerar.")

    try:
        # Criar diretório das cenas
        scene_dir = OUTPUT_DIR / project_id / "scenes"
        scene_dir.mkdir(parents=True, exist_ok=True)

        # Semáforo: máximo 2 FFmpeg concorrentes (CPU bound)
        ffmpeg_semaphore = asyncio.Semaphore(2)

        # Lançar TODAS as cenas em paralelo
        tasks = [
            _generate_single_scene(
                project_id=project_id,
                scene_idx=i,
                scene_data=s,
                all_scenes=req.all_scenes,
                visual_engine=req.visual_engine,
                subtitle_options=req.subtitle_options,
                voice=req.voice,
                semaphore=ffmpeg_semaphore,
            )
            for i, s in enumerate(req.scenes)
        ]

        # asyncio.gather() — TODAS as cenas rodam simultaneamente
        # return_exceptions=True: se uma cena falha, as outras continuam
        raw_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Converter exceções em dicts de erro
        results = []
        for i, r in enumerate(raw_results):
            if isinstance(r, Exception):
                results.append({
                    "scene_index": i,
                    "success": False,
                    "output_path": None,
                    "error": str(r),
                })
            else:
                results.append(r)

        # Registrar caminhos no job store
        scenes_paths = []
        all_success = True
        for r in results:
            if r.get("output_path"):
                scenes_paths.append(r["output_path"])
            if not r.get("success"):
                all_success = False

        if project_id in jobs:
            jobs[project_id]["scenes_paths"] = sorted(scenes_paths)
            jobs[project_id]["progress"] = 80 if all_success else 50
            jobs[project_id]["status"] = "scenes_generated" if all_success else "partial_error"
            jobs[project_id]["visual_engine"] = req.visual_engine

        if not scenes_paths:
            raise HTTPException(status_code=500, detail="Nenhuma cena foi gerada com sucesso.")

        return StudioGenerateAllResponse(
            success=all_success,
            scenes=results,
            error=None if all_success else "Algumas cenas falharam, mas outras foram geradas.",
        )
    except Exception as e:
        print(f"  [ERROR] studio_generate_all_scenes: {e}")
        return StudioGenerateAllResponse(
            success=False,
            error=str(e),
        )


@app.post("/api/studio/stitch")
async def studio_stitch(req: StudioStitchRequest):
    """Concatena todas as cenas e adiciona música de fundo mais o CTA final."""
    project_id = req.project_id

    try:
        scene_dir = OUTPUT_DIR / project_id / "scenes"
        if not scene_dir.exists():
            raise HTTPException(status_code=404, detail="Cenas não encontradas")

        video_files = sorted(scene_dir.glob("scene_*.mp4"))
        if not video_files and project_id in jobs:
            paths = jobs[project_id].get("scenes_paths", [])
            video_files = [Path(p) for p in paths if Path(p).exists()]

        if not video_files:
            raise HTTPException(status_code=404, detail="Nenhum arquivo de cena encontrado")

        output_dir = OUTPUT_DIR / project_id
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # 1. Gerar o CTA outro de encerramento
        cta_path = output_dir / "cta_outro.mp4"
        _generate_cta_outro(cta_path, "Siga para mais!", SYSTEM_FONT)

        # 2. Obter ou gerar música de fundo (60s) ou usar áudio personalizado
        bgm_path = OUTPUT_DIR / "_bgm.wav"
        use_custom_audio = False
        
        if req.custom_audio:
            custom_audio_path = OUTPUT_DIR / "audio" / req.custom_audio
            if custom_audio_path.exists():
                bgm_path = custom_audio_path
                use_custom_audio = True
                print(f"  [STITCH] Usando áudio personalizado: {req.custom_audio}")
        
        if not bgm_path.exists():
            _generate_background_music(bgm_path, 60.0)

        # 3. Concatenar cenas com transições suaves (xfade)
        fade_duration = req.transition_duration if req.transition_duration is not None else 0.5
        fade_duration = max(0.3, min(1.0, fade_duration))
        transition_type = req.transition_type if req.transition_type else "fade"
        scenes_stitched_temp = output_dir / "scenes_stitched_temp.mp4"
        scene_paths_str = [str(vf) for vf in video_files]
        
        xfade_ok = _concat_with_xfade(scene_paths_str, scenes_stitched_temp, fade_duration=fade_duration, transition=transition_type)
        if not xfade_ok:
            raise HTTPException(status_code=500, detail="Falha ao concatenar cenas com transições.")
        
        # 4. Mixar música de fundo nas cenas concatenadas
        scenes_with_bgm = output_dir / "scenes_with_bgm.mp4"
        if bgm_path.exists():
            # Se for áudio personalizado, usar volume maior (0.5) para destaque
            custom_vol = "0.5" if use_custom_audio else "0.08"
            ret, _, stderr = run_ffmpeg([
                "-i", str(scenes_stitched_temp),
                "-i", str(bgm_path),
                "-filter_complex",
                f"[0:a]volume=1.0[a0];[1:a]volume={custom_vol}[a1];[a0][a1]amix=inputs=2:duration=first[out]",
                "-map", "0:v",
                "-map", "[out]",
                "-c:v", "copy",
                "-c:a", "aac",
                "-shortest",
                "-y", str(scenes_with_bgm),
            ])
            if ret == 0 and scenes_with_bgm.exists():
                scenes_stitched_temp = scenes_with_bgm
        
        # 5. Anexar o CTA outro final com transição
        final_path = output_dir / "final.mp4"
        if cta_path.exists():
            _concat_with_xfade(
                [str(scenes_stitched_temp), str(cta_path)],
                final_path,
                fade_duration=min(fade_duration, 0.4),
                transition=transition_type,
            )
        else:
            shutil.copy2(scenes_stitched_temp, final_path)
        
        scenes_stitched_temp.unlink(missing_ok=True)
        scenes_with_bgm.unlink(missing_ok=True)

        if not final_path.exists():
            raise HTTPException(status_code=500, detail="Falha ao gerar vídeo final.")

        if project_id in jobs:
            jobs[project_id]["status"] = "done"
            jobs[project_id]["progress"] = 100
            jobs[project_id]["output_path"] = str(final_path)

        return StudioStitchResponse(
            success=True,
            project_id=project_id,
            output_path=str(final_path),
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"  [ERROR] studio_stitch: {e}")
        return StudioStitchResponse(
            success=False,
            project_id=project_id,
            error=str(e),
        )

# --- Upload & Concat Video Features ----------------------------------

def _get_video_duration(video_path: Path) -> float:
    """Retorna a duração do vídeo usando ffprobe se disponível."""
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(video_path)
            ],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            return float(result.stdout.strip())
    except Exception as e:
        print(f"  [WARN] Falha ao obter duração com ffprobe: {e}")
    return 0.0

def _has_audio(video_path: Path) -> bool:
    """Verifica se o vídeo possui uma faixa de áudio usando ffprobe."""
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-select_streams", "a",
                "-show_entries", "stream=codec_type",
                "-of", "default=noprint_wrappers=1:nokey=1",
                str(video_path)
            ],
            capture_output=True,
            text=True,
            timeout=10
        )
        return "audio" in result.stdout
    except Exception as e:
        print(f"  [WARN] Falha ao verificar áudio com ffprobe: {e}")
    return False

async def process_video_concat(
    job_id: str,
    video_files: list[str],
    audio_effect: str,
    title_text: Optional[str]
):
    """Tarefa em segundo plano para normalizar e concatenar vídeos."""
    job_dir = OUTPUT_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    processed_dir = job_dir / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        if not video_files:
            raise ValueError("Lista de vídeos vazia.")
            
        processed_paths = []
        n_files = len(video_files)
        
        # 1. Normalizar cada vídeo individualmente
        for i, filename in enumerate(video_files):
            input_path = OUTPUT_DIR / "uploads" / filename
            if not input_path.exists():
                raise FileNotFoundError(f"Arquivo não encontrado: {filename}")
                
            output_path = processed_dir / f"standardized_{i:03d}.mp4"
            print(f"  [CONCAT JOB {job_id}] Normalizando ({i+1}/{n_files}): {filename}")
            
            jobs[job_id]["progress"] = 10 + int((i / n_files) * 60)
            
            has_aud = _has_audio(input_path)
            
            # Normalizar para vertical 1080x1920 @ 30 FPS, áudio AAC stereo 44100Hz
            if has_aud:
                cmd = [
                    "-i", str(input_path),
                    "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,fps=30",
                    "-c:v", "libx264",
                    "-preset", "ultrafast",
                    "-crf", "28",
                    "-c:a", "aac",
                    "-ar", "44100",
                    "-ac", "2",
                    "-pix_fmt", "yuv420p",
                    "-y", str(output_path)
                ]
            else:
                cmd = [
                    "-i", str(input_path),
                    "-f", "lavfi",
                    "-i", "anullsrc=r=44100:cl=stereo",
                    "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,fps=30",
                    "-c:v", "libx264",
                    "-preset", "ultrafast",
                    "-crf", "28",
                    "-c:a", "aac",
                    "-shortest",
                    "-pix_fmt", "yuv420p",
                    "-y", str(output_path)
                ]
                
            ret, _, stderr = run_ffmpeg(cmd)
            if ret != 0 or not output_path.exists():
                raise RuntimeError(f"Erro ao padronizar o vídeo {filename}: {stderr[:200]}")
                
            processed_paths.append(output_path)
            
        # 2. Concatenar vídeos normalizados com crossfade
        fade_dur = jobs[job_id].get("transition_duration", 0.5)
        trans_type = jobs[job_id].get("transition_type", "fade")
        stitched_temp = job_dir / "stitched_temp.mp4"
        jobs[job_id]["status"] = "stitching"
        jobs[job_id]["progress"] = 75
        print(f"  [CONCAT JOB {job_id}] Concatenando vídeos com {trans_type} ({fade_dur}s)...")
        
        processed_paths_str = [str(p) for p in processed_paths]
        if not _concat_with_xfade(processed_paths_str, stitched_temp, fade_duration=fade_dur, transition=trans_type):
            raise RuntimeError("Falha na concatenação com crossfade.")
            
        # 4. Adicionar música de fundo (BGM) se solicitado
        if audio_effect != "original":
            jobs[job_id]["progress"] = 85
            duration = _get_video_duration(stitched_temp) or 30.0
            bgm_path = job_dir / "bgm.wav"
            print(f"  [CONCAT JOB {job_id}] Gerando música de fundo ({duration}s)...")
            _generate_background_music(bgm_path, duration)
            
            if bgm_path.exists():
                stitched_bgm = job_dir / "stitched_bgm.mp4"
                print(f"  [CONCAT JOB {job_id}] Mixando áudio de fundo...")
                ret, _, stderr = run_ffmpeg([
                    "-i", str(stitched_temp),
                    "-i", str(bgm_path),
                    "-filter_complex", "[0:a]volume=1.0[a0];[1:a]volume=0.08[a1];[a0][a1]amix=inputs=2:duration=first[out]",
                    "-map", "0:v",
                    "-map", "[out]",
                    "-c:v", "copy",
                    "-c:a", "aac",
                    "-shortest",
                    "-y", str(stitched_bgm)
                ])
                if ret == 0 and stitched_bgm.exists():
                    stitched_temp = stitched_bgm
                    
        # 5. Adicionar legenda/título se solicitado
        if title_text and SYSTEM_FONT:
            jobs[job_id]["progress"] = 90
            temp_txt_path = job_dir / "title_text.txt"
            drawtext_filter = _build_drawtext_filter(
                text=title_text,
                font_path=SYSTEM_FONT,
                subtitle_options=SubtitleOptions(style="yellow_premium", position="top", fontSize=56),
                temp_txt_path=temp_txt_path
            )
            if drawtext_filter:
                final_with_text = job_dir / "final_with_text.mp4"
                print(f"  [CONCAT JOB {job_id}] Adicionando overlay de título...")
                ret, _, stderr = run_ffmpeg([
                    "-i", str(stitched_temp),
                    "-vf", drawtext_filter,
                    "-c:v", "libx264",
                    "-preset", "ultrafast",
                    "-crf", "35",
                    "-c:a", "copy",
                    "-y", str(final_with_text)
                ])
                if ret == 0 and final_with_text.exists():
                    stitched_temp = final_with_text
                    
        # 6. Mover para o arquivo final
        final_path = job_dir / "final.mp4"
        shutil.copy2(stitched_temp, final_path)
        
        # Cleanup arquivos temporários de processamento
        shutil.rmtree(processed_dir, ignore_errors=True)
        
        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["output_path"] = str(final_path)
        print(f"  [CONCAT JOB {job_id}] Concluído com sucesso! Vídeo final em: {final_path}")
        
    except Exception as e:
        print(f"  [CONCAT JOB ERROR {job_id}] {e}")
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        jobs[job_id]["progress"] = 0

@app.post("/api/video/upload", response_model=VideoUploadResponse)
async def upload_video(file: UploadFile = File(...)):
    """Rota para upload de arquivos de vídeo individuais."""
    try:
        upload_dir = OUTPUT_DIR / "uploads"
        upload_dir.mkdir(exist_ok=True)
        
        file_id = uuid.uuid4().hex[:8]
        ext = Path(file.filename).suffix or ".mp4"
        saved_name = f"{file_id}{ext}"
        saved_path = upload_dir / saved_name
        
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        duration = _get_video_duration(saved_path)
        file_size = saved_path.stat().st_size
        
        return VideoUploadResponse(
            success=True,
            file_id=file_id,
            filename=file.filename,
            saved_name=saved_name,
            duration=duration,
            file_size=file_size
        )
    except Exception as e:
        print(f"  [ERROR] upload_video: {e}")
        return VideoUploadResponse(
            success=False,
            file_id="",
            filename="",
            saved_name="",
            duration=0.0,
            file_size=0,
            error=str(e)
        )

class UploadClipRequest(BaseModel):
    saved_name: str = Field(..., description="Nome do arquivo salvo (retornado pelo /api/video/upload)")

@app.post("/api/clip/from-upload")
async def clip_from_upload(req: UploadClipRequest):
    """
    Recebe um vídeo já enviado (via /api/video/upload), extrai áudio,
    analisa com Gemini para identificar melhores momentos, corta e edita.
    = clip_extract sem a etapa de download do YouTube.
    """
    job_id = f"upload-clip-{uuid.uuid4().hex[:8]}"
    jobs[job_id] = {"status": "analyzing", "progress": 10}

    try:
        return await asyncio.wait_for(
            _upload_clip_internal(req.saved_name, job_id),
            timeout=240.0
        )
    except asyncio.TimeoutError:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = "Tempo limite excedido (4 min)."
        jobs[job_id]["progress"] = 0
        return ClipExtractResponse(success=False, job_id=job_id, error="Tempo limite.")
    except HTTPException:
        raise
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        print(f"  [ERROR] clip_from_upload: {e}")
        return ClipExtractResponse(success=False, job_id=job_id, error=str(e))

async def _upload_clip_internal(saved_name: str, job_id: str):
    """Processa vídeo enviado: analisa com Gemini, corta e concatena clipes."""
    temp_dir = OUTPUT_DIR / job_id
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    video_path = OUTPUT_DIR / "uploads" / saved_name
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado. Faça upload primeiro.")
    
    print(f"  [UPLOAD-CLIP] Analisando: {saved_name}")
    _check_cancelled(job_id)
    jobs[job_id]["progress"] = 20
    
    local_video = temp_dir / "source.mp4"
    shutil.copy2(video_path, local_video)
    video_duration = _get_video_duration(local_video) or 60.0
    print(f"  [UPLOAD-CLIP] Duração: {video_duration:.1f}s")
    jobs[job_id]["progress"] = 30
    
    client = get_gemini_client()
    
    _check_cancelled(job_id)
    
    if client:
        print(f"  [UPLOAD-CLIP] Extraindo áudio para análise Gemini...")
        audio_path = temp_dir / "audio.mp3"
        subprocess.run([
            "ffmpeg", "-y", "-i", str(local_video),
            "-vn", "-acodec", "libmp3lame", "-ac", "1", "-ar", "16000", "-ab", "32k",
            str(audio_path)
        ], capture_output=True, timeout=60)
        jobs[job_id]["progress"] = 40
        
        if audio_path.exists() and audio_path.stat().st_size > 1024:
            print(f"  [UPLOAD-CLIP] Enviando áudio para Gemini...")
            gemini_file = client.files.upload(file=str(audio_path))
            time.sleep(2.0)
            prompt = f"Analise o áudio deste vídeo de {video_duration:.0f}s e extraia os 3-5 melhores momentos (15-60s cada)."
            try:
                segments_data = _call_gemini_json(
                    prompt=prompt,
                    system_prompt="Editor de vídeos virais. Identifique os melhores momentos.",
                    response_schema=ClipListModel,
                    contents=[gemini_file, prompt]
                )
            finally:
                try: client.files.delete(name=gemini_file.name)
                except: pass
        else:
            segments_data = _gen_simulated_segments(video_duration)
    else:
        segments_data = _gen_simulated_segments(video_duration)
    
    jobs[job_id]["progress"] = 50
    segments_list = segments_data.get("segments", [])
    segments = []
    for s in segments_list:
        segments.append(ClipSegment(
            start=float(s["start"]), end=float(s["end"]),
            viral_hook=s.get("viral_hook", ""), caption=s.get("caption", ""),
        ))
    if not segments:
        raise HTTPException(status_code=400, detail="Nenhum segmento identificado.")
    
    jobs[job_id]["segments"] = [s.model_dump() for s in segments]
    jobs[job_id]["status"] = "clipping"
    _check_cancelled(job_id)
    jobs[job_id]["progress"] = 60
    
    clips_dir = temp_dir / "clips"
    clips_dir.mkdir(exist_ok=True)
    clip_paths = []
    for i, seg in enumerate(segments):
        clip_out = clips_dir / f"clip_{i:03d}.mp4"
        duration = seg.end - seg.start
        vf = "crop=ih*9/16:ih:(iw-ow)/2:0,scale=1080:1920,fps=30"
        vf += ",vignette=angle=0.12,noise=alls=5:allf=t+u,eq=contrast=1.03:saturation=1.05"
        if i == 0: vf += ",fade=t=in:st=0:d=1.5:color=white"
        cmd = [
            "-ss", format_timestamp(seg.start), "-i", str(local_video),
            "-t", format_timestamp(duration), "-vf", vf,
            "-c:v", "libx264", "-preset", "ultrafast", "-crf", "35",
            "-c:a", "aac", "-ar", "44100", "-ac", "2",
            "-shortest", "-y", str(clip_out)
        ]
        ret, _, stderr = run_ffmpeg(cmd)
        if ret == 0 and clip_out.exists():
            clip_paths.append(str(clip_out))
        else:
            print(f"  [WARN] Falha clipe {i}: {stderr[:200]}")
    
    if not clip_paths:
        raise HTTPException(status_code=500, detail="Nenhum clipe gerado.")
    jobs[job_id]["progress"] = 85
    
    cta_path = temp_dir / "cta_outro.mp4"
    _generate_cta_outro(cta_path, "Siga para mais!", SYSTEM_FONT)
    concat_path = temp_dir / "final.mp4"
    all_clips = list(clip_paths)
    if cta_path.exists(): all_clips.append(str(cta_path))
    if not _concat_with_xfade(all_clips, concat_path, fade_duration=0.4):
        raise HTTPException(status_code=500, detail="Falha na concatenação.")
    
    jobs[job_id]["output_path"] = str(concat_path)
    jobs[job_id]["status"] = "done"
    jobs[job_id]["progress"] = 100
    return ClipExtractResponse(success=True, job_id=job_id, segments=segments, output_path=str(concat_path))

def _check_cancelled(job_id: str):
    """Levanta HTTPException 499 se o job foi cancelado."""
    if job_id in jobs and jobs[job_id].get('status') == 'cancelled':
        raise HTTPException(status_code=499, detail="Processamento cancelado pelo usuário")

def _gen_simulated_segments(duration: float) -> dict:
    """Segmentos simulados baseados na duração."""
    if duration < 15.0:
        return {"segments": [{"start": 0.0, "end": duration, "viral_hook": "Vídeo completo", "caption": "Vídeo completo! "}]}
    clip_len = min(15.0, duration / 3.0)
    n = min(4, max(2, int(duration // clip_len)))
    segs = []
    for i in range(n):
        start = i * clip_len
        end = min(start + clip_len, duration)
        if end - start < 3: break
        segs.append({"start": start, "end": end, "viral_hook": f"Momento {i+1}", "caption": f"Melhor parte {i+1}! "})
    return {"segments": segs}

@app.post("/api/video/concat", response_model=VideoConcatResponse)
async def concat_videos(req: VideoConcatRequest, background_tasks: BackgroundTasks):
    """Inicia o processo de concatenação de vídeos em segundo plano."""
    job_id = f"concat-{uuid.uuid4().hex[:8]}"
    jobs[job_id] = {
        "status": "processing",
        "progress": 10,
        "video_files": req.video_files,
        "audio_effect": req.audio_effect,
        "title_text": req.title_text
    }
    
    fade_dur = req.transition_duration if req.transition_duration is not None else 0.5
    fade_dur = max(0.3, min(1.0, fade_dur))
    trans_type = req.transition_type if req.transition_type else "fade"
    jobs[job_id]["transition_duration"] = fade_dur
    jobs[job_id]["transition_type"] = trans_type
    background_tasks.add_task(
        process_video_concat,
        job_id=job_id,
        video_files=req.video_files,
        audio_effect=req.audio_effect,
        title_text=req.title_text,
    )
    
    return VideoConcatResponse(
        success=True,
        job_id=job_id
    )

# --- Custom Audio Upload -----------------------------------------
class AudioUploadResponse(BaseSchema):
    success: bool
    file_id: str
    filename: str
    saved_name: str
    file_size: int
    error: Optional[str] = None

@app.post("/api/audio/upload", response_model=AudioUploadResponse)
async def upload_audio(file: UploadFile = File(...)):
    """Rota para upload de arquivos de áudio personalizados para música de fundo."""
    try:
        audio_dir = OUTPUT_DIR / "audio"
        audio_dir.mkdir(exist_ok=True)
        
        file_id = uuid.uuid4().hex[:8]
        ext = Path(file.filename).suffix or ".mp3"
        saved_name = f"audio_{file_id}{ext}"
        saved_path = audio_dir / saved_name
        
        content = await file.read()
        max_size = 20 * 1024 * 1024  # 20MB
        if len(content) > max_size:
            return AudioUploadResponse(
                success=False,
                file_id="",
                filename=file.filename or "",
                saved_name="",
                file_size=0,
                error="Arquivo muito grande. Máximo 20MB."
            )
        
        with open(saved_path, "wb") as buffer:
            buffer.write(content)
        
        file_size = saved_path.stat().st_size
        
        return AudioUploadResponse(
            success=True,
            file_id=file_id,
            filename=file.filename or "audio.mp3",
            saved_name=saved_name,
            file_size=file_size,
        )
    except Exception as e:
        print(f"  [ERROR] upload_audio: {e}")
        return AudioUploadResponse(
            success=False,
            file_id="",
            filename="",
            saved_name="",
            file_size=0,
            error=str(e)
        )


if __name__ == "__main__":
    import uvicorn
    print(f" Shorts Studio API rodando em http://{HOST}:{PORT}")
    uvicorn.run(
        "fastapi_backend:app",
        host=HOST,
        port=PORT,
        reload=True,
    )
