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
import json
import os
import re
import shutil
import subprocess
import time
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
from google import genai
from google.genai import types

# --- Load Environment ------------------------------------------------
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# --- Paths -----------------------------------------------------------
BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

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
    subtitle_options: Optional[SubtitleOptions] = Field(None, alias="subtitleOptions")

class StudioStitchRequest(BaseModel):
    project_id: str
    scenes: list[SceneScript]
    subtitle_options: Optional[SubtitleOptions] = Field(None, alias="subtitleOptions")

class StudioGenerateResponse(BaseSchema):
    success: bool
    scene_index: int
    output_path: Optional[str] = None
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

class VideoConcatResponse(BaseSchema):
    success: bool
    job_id: str
    error: Optional[str] = None

class HealthResponse(BaseSchema):
    status: str
    version: str
    ffmpeg_available: bool
    groq_configured: bool  # Mantido para compatibilidade
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
    """Busca vídeo B-roll no Pexels e baixa para o caminho especificado."""
    if not PEXELS_API_KEY:
        return False
    try:
        url = "https://api.pexels.com/videos/search"
        headers = {"Authorization": PEXELS_API_KEY}
        keywords = query[:80].strip()
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
        print(f"  [B-ROLL] Baixando: {video_url[:60]}...")
        
        video_resp = http_req.get(video_url, timeout=timeout, stream=True)
        if video_resp.status_code != 200:
            return False
        
        with open(output_path, "wb") as f:
            for chunk in video_resp.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
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
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
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
                "--output", str(sub_prefix),
                url
            ],
            capture_output=True, text=True, timeout=30, check=True
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
async def _generate_scene_audio(text: str, output_path: Path) -> bool:
    """Gera áudio de narração TTS usando Edge TTS (grátis)."""
    try:
        import edge_tts
        communicate = edge_tts.Communicate(text, "pt-BR-AntonioNeural")
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
        return ret == 0 and output_path.exists()
    except Exception as e:
        print(f"  [WARN] BGM error: {e}")
        return False

def _generate_cta_outro(output_path: Path, text: str, font_path: str) -> bool:
    """Gera vídeo de CTA de 3 segundos com fade e sino sintetizado."""
    try:
        drawtext_filter = ""
        if font_path:
            # CTA outro padrão usa a formatação com quebra de linha de até 25 caracteres
            wrapped_text = wrap_text(text, max_chars=25)
            escaped_txt = wrapped_text.replace(chr(39), "").replace(':', '')
            drawtext_filter = (
                f",drawtext=text='{escaped_txt}':fontfile='{font_path.replace(':', '\\:')}':"
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
        groq_configured=GEMINI_API_KEY != "", # Mantido para compatibilidade
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

    try:
        temp_dir = OUTPUT_DIR / job_id
        temp_dir.mkdir(parents=True, exist_ok=True)
        video_path = temp_dir / "source.mp4"

        # 1. Download do vídeo original via yt-dlp
        print(f"  [CLIPPING] Baixando vídeo: {req.youtube_url}")
        jobs[job_id]["progress"] = 20
        subprocess.run(
            ["yt-dlp", "-f", "best[height<=720]", "-o", str(video_path),
             "--no-playlist", "--quiet", req.youtube_url],
            capture_output=True, text=True, timeout=180, check=True,
        )

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
                ], capture_output=True)

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
                            response_schema=ClipListModel
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
            # Modo simulado sem API key
            segments_data = _call_gemini_json(
                prompt=f"Analise o vídeo: {req.youtube_url}",
                system_prompt="Simulando clipping",
                response_schema=ClipListModel
            )

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
            
            # crop=ih*9/16:ih:(iw-ow)/2:0 faz crop central vertical
            # fps=30 garante compatibilidade absoluta de concatenação posterior
            vf = "crop=ih*9/16:ih:(iw-ow)/2:0,scale=1080:1920,fps=30"
            vf += ",vignette=angle=0.12,noise=alls=5:allf=t+u,eq=contrast=1.03:saturation=1.05"
            
            # Efeito Hook (flash glow de entrada de 1.5 segundos no primeiro clipe)
            if i == 0:
                vf += ",fade=t=in:st=0:d=1.5:color=white"
                
            # Burn legendas personalizadas usando a nova função com textfile
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

            # Comando FFmpeg com mixagem de áudio
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
                cmd += [
                    "-vf", vf,
                    "-c:a", "aac"
                ]
                
            cmd += [
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
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

        # 4. Programar e concatenar CTA de Encerramento (Outro)
        cta_path = temp_dir / "cta_outro.mp4"
        _generate_cta_outro(cta_path, "Siga para mais!", SYSTEM_FONT)

        concat_path = temp_dir / "final.mp4"
        list_file = temp_dir / "list.txt"
        with open(list_file, "w") as f:
            for cp in clip_paths:
                f.write(f"file '{Path(cp).as_posix()}'\n")
            if cta_path.exists():
                f.write(f"file '{cta_path.as_posix()}'\n")

        # Concatenação ultra-rápida (lossless) pois todos os arquivos possuem os mesmos atributos de codificação
        ret, _, stderr = run_ffmpeg([
            "-f", "concat",
            "-safe", "0",
            "-i", str(list_file),
            "-c", "copy",
            "-y", str(concat_path),
        ])

        if ret != 0 or not concat_path.exists():
            raise HTTPException(status_code=500, detail=f"Falha ao concatenar clipes: {stderr[:200]}")

        jobs[job_id]["output_path"] = str(concat_path)
        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 100

        return ClipExtractResponse(
            success=True,
            job_id=job_id,
            segments=segments,
            output_path=str(concat_path),
        )

    except HTTPException:
        raise
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        print(f"  [ERROR] clip_extract: {e}")
        return ClipExtractResponse(success=False, job_id=job_id, error=str(e))

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
    """Gera roteiro com Gemini 3.5 Flash estruturado em 5 cenas."""
    project_id = f"studio-{uuid.uuid4().hex[:8]}"
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

@app.post("/api/studio/generate-scene")
async def studio_generate_scene(req: StudioSceneGenerateRequest):
    """Gera vídeo de uma cena do roteiro via FFmpeg + B-roll + TTS."""
    project_id = req.project_id
    scene_idx = req.scene_index

    try:
        scene_dir = OUTPUT_DIR / project_id / "scenes"
        scene_dir.mkdir(parents=True, exist_ok=True)

        output_path = scene_dir / f"scene_{scene_idx:03d}.mp4"
        broll_path = scene_dir / f"broll_{scene_idx:03d}.mp4"

        # Pexels download
        broll_query = req.scene.visual_prompt or req.scene.scene_description
        has_broll = _search_and_download_broll(broll_query, broll_path)

        # Narração TTS
        audio_path = scene_dir / f"audio_{scene_idx:03d}.mp3"
        has_audio = await _generate_scene_audio(req.scene.caption, audio_path)

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

        # 2. Obter ou gerar música de fundo (60s)
        bgm_path = OUTPUT_DIR / "_bgm.wav"
        if not bgm_path.exists():
            _generate_background_music(bgm_path, 60.0)

        # 3. Concatenar as cenas e misturar música de fundo
        list_file = output_dir / "scenes_list.txt"
        with open(list_file, "w") as f:
            for vf in video_files:
                f.write(f"file '{vf.as_posix()}'\n")

        scenes_stitched_temp = output_dir / "scenes_stitched_temp.mp4"
        
        # Concatena cenas + mixagem de música ambiente
        if bgm_path.exists():
            ret, _, stderr = run_ffmpeg([
                "-f", "concat",
                "-safe", "0",
                "-i", str(list_file),
                "-i", str(bgm_path),
                "-filter_complex",
                "[0:a]volume=1.0[a0];[1:a]volume=0.08[a1];[a0][a1]amix=inputs=2:duration=first[out]",
                "-map", "0:v",
                "-map", "[out]",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-pix_fmt", "yuv420p",
                "-shortest",
                "-y",
                str(scenes_stitched_temp),
            ])
        else:
            ret = -1

        # Fallback se a mixagem de música falhar
        if ret != 0:
            print("  [WARN] BGM amix falhou, tentando concat simples das cenas...")
            ret, _, stderr = run_ffmpeg([
                "-f", "concat",
                "-safe", "0",
                "-i", str(list_file),
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-pix_fmt", "yuv420p",
                "-y",
                str(scenes_stitched_temp),
            ])

        if ret != 0 or not scenes_stitched_temp.exists():
            raise HTTPException(status_code=500, detail=f"Falha ao concatenar cenas: {stderr[:200]}")

        # 4. Anexar o CTA outro final
        final_path = output_dir / "final.mp4"
        final_list_file = output_dir / "final_list.txt"
        with open(final_list_file, "w") as f:
            f.write(f"file '{scenes_stitched_temp.as_posix()}'\n")
            if cta_path.exists():
                f.write(f"file '{cta_path.as_posix()}'\n")

        ret, _, stderr = run_ffmpeg([
            "-f", "concat",
            "-safe", "0",
            "-i", str(final_list_file),
            "-c", "copy",
            "-y",
            str(final_path),
        ])

        # Cleanup do arquivo temporário
        scenes_stitched_temp.unlink(missing_ok=True)

        if ret != 0 or not final_path.exists():
            raise HTTPException(status_code=500, detail=f"Falha ao costurar CTA final: {stderr[:200]}")

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
            
        # 2. Escrever lista de arquivos para concatenação
        list_file = job_dir / "concat_list.txt"
        with open(list_file, "w", encoding="utf-8") as f:
            for path in processed_paths:
                f.write(f"file '{path.as_posix()}'\n")
                
        # 3. Concatenar vídeos normalizados
        stitched_temp = job_dir / "stitched_temp.mp4"
        jobs[job_id]["status"] = "stitching"
        jobs[job_id]["progress"] = 75
        print(f"  [CONCAT JOB {job_id}] Concatenando vídeos...")
        
        ret, _, stderr = run_ffmpeg([
            "-f", "concat",
            "-safe", "0",
            "-i", str(list_file),
            "-c", "copy",
            "-y", str(stitched_temp)
        ])
        
        if ret != 0 or not stitched_temp.exists():
            raise RuntimeError(f"Falha na concatenação dos vídeos: {stderr[:200]}")
            
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
                    "-crf", "23",
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
        list_file.unlink(missing_ok=True)
        
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
    
    background_tasks.add_task(
        process_video_concat,
        job_id=job_id,
        video_files=req.video_files,
        audio_effect=req.audio_effect,
        title_text=req.title_text
    )
    
    return VideoConcatResponse(
        success=True,
        job_id=job_id
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
