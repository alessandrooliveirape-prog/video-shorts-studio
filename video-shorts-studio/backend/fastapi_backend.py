"""
Shorts Studio - FastAPI Backend (100% Gratuito)
=================================================
APIs gratuitas utilizadas:
  [OK] Groq Cloud (LLaMA 3 70B) - Analise de texto, roteirizacao, ganchos virais
  [OK] yt-dlp                   - Download de videos do YouTube
  [OK] FFmpeg                   - Corte 9:16, geracao de cenas, concatenacao, efeitos

NENHUMA API PAGA E NECESSARIA. O Groq Cloud nao requer cartao de credito.
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
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import requests as http_req
from openai import OpenAI
from pydantic import BaseModel, Field


# --- Base Schema com camelCase para JSON ---

def _camel_case(s: str) -> str:
    """Converte snake_case para camelCase."""
    parts = s.split('_')
    return parts[0] + ''.join(p.capitalize() for p in parts[1:])


class BaseSchema(BaseModel):
    """Schema base que serializa JSON em camelCase."""
    model_config = {
        "alias_generator": _camel_case,
        "populate_by_name": True,
    }

# --- Load Environment ------------------------------------------------

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# --- Paths -----------------------------------------------------------

BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

# --- Groq Cloud (API gratuita - sem cartao de credito) --------------

groq_client: OpenAI | None = None

def get_groq_client() -> OpenAI | None:
    """Retorna o cliente Groq. Retorna None se nao houver chave (modo simulado)."""
    global groq_client
    if groq_client is None and GROQ_API_KEY:
        try:
            groq_client = OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=GROQ_API_KEY,
            )
            # Testa se a chave funciona
            groq_client.models.list()
        except Exception:
            print("  [WARN]  Erro ao inicializar Groq. Verifique sua GROQ_API_KEY.")
            groq_client = None
    return groq_client


# --- FFmpeg Check ----------------------------------------------------

def ensure_ffmpeg():
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        raise RuntimeError(
            "FFmpeg nao encontrado. "
            "Instale: winget install ffmpeg (Win) / brew install ffmpeg (Mac) / "
            "sudo apt install ffmpeg (Linux)"
        )

ensure_ffmpeg()


# --- Font Check (para drawtext) --------------------------------------

def _find_system_font() -> str:
    """Retorna o caminho de uma fonte TTF disponivel no sistema."""
    # Fontes comuns por SO
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
if SYSTEM_FONT:
    print(f"  [OK] Fonte para legendas: {Path(SYSTEM_FONT).name}")
else:
    print("  [WARN]  Nenhuma fonte TTF encontrada - legendas NAO serao renderizadas nos videos")
    print("      Instale uma fonte: sudo apt install fonts-dejavu-core (Linux)")


# --- App Lifespan ----------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[START]  Shorts Studio Backend (100% Gratuito) - Iniciando...")
    if GROQ_API_KEY:
        print("  [OK] Groq Cloud configurado (API gratuita)")
    else:
        print("  [WARN]  GROQ_API_KEY nao definida - modo simulado (funciona sem chave)")
    if SYSTEM_FONT:
        print(f"  [OK] Fonte para legendas: {Path(SYSTEM_FONT).name}")
    else:
        print("  [WARN]  Nenhuma fonte TTF encontrada - legendas sem drawtext")
    print(f"  [DIR] Outputs: {OUTPUT_DIR}")
    yield
    print("[BYE] Servidor encerrado.")


# --- FastAPI App -----------------------------------------------------

app = FastAPI(
    title="Shorts Studio API (Gratuita)",
    version="1.1.0",
    description="API 100% gratuita de criacao e clipping de videos para Shorts/TikTok",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------

class ClipExtractRequest(BaseModel):
    youtube_url: str = Field(..., description="URL do video do YouTube")
    audio_effect: str = Field("original", description="Efeito de audio desejado")

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
    idea: str = Field(..., description="Ideia para o video")

class SceneScript(BaseSchema):
    scene_index: int
    scene_description: str
    duration: float
    caption: str
    visual_prompt: str
    character_ref: Optional[str] = None

class StudioSceneGenerateRequest(BaseModel):
    project_id: str
    scene_index: int
    scene: SceneScript
    all_scenes: list[SceneScript]

class StudioStitchRequest(BaseModel):
    project_id: str
    scenes: list[SceneScript]

class StudioScriptResponse(BaseSchema):
    success: bool
    project_id: str
    scenes: Optional[list[SceneScript]] = None
    error: Optional[str] = None

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
    description: str = "Criado com Shorts Studio "

class HealthResponse(BaseSchema):
    status: str
    version: str
    ffmpeg_available: bool
    groq_configured: bool

# -----------------------------------------------------------------------
# In-memory Job Store
# -----------------------------------------------------------------------

jobs: dict[str, dict] = {}

def get_job(job_id: str) -> dict:
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job nao encontrado")
    return jobs[job_id]

def update_job(job_id: str, **updates):
    if job_id in jobs:
        jobs[job_id].update(updates)

# -----------------------------------------------------------------------
# Utility Functions
# -----------------------------------------------------------------------

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
        raise RuntimeError("FFmpeg nao encontrado no PATH")


def clean_temp_dir(temp_dir: str | Path):
    path = Path(temp_dir)
    if path.exists():
        shutil.rmtree(path, ignore_errors=True)


def format_timestamp(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:06.3f}"


def _get_video_duration(path: Path) -> float:
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error",
             "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1",
             str(path)],
            capture_output=True, text=True, timeout=15,
        )
        return float(result.stdout.strip())
    except Exception:
        return 120.0


def _search_and_download_broll(query: str, output_path: Path, timeout: int = 30) -> bool:
    """
    Busca um video B-roll no Pexels e baixa para o caminho especificado.
    Retorna True se conseguiu baixar, False caso contrario (fallback para cor solida).
    """
    if not PEXELS_API_KEY:
        return False
    
    try:
        # 1. Buscar video no Pexels
        url = "https://api.pexels.com/videos/search"
        headers = {"Authorization": PEXELS_API_KEY}
        # Extrair palavras-chave da query (limpar descricoes muito longas)
        keywords = query[:80].strip()
        params = {"query": keywords, "per_page": 5, "orientation": "portrait", "size": "medium"}
        
        resp = http_req.get(url, headers=headers, params=params, timeout=15)
        if resp.status_code != 200:
            print(f"  [WARN] Pexels API error: {resp.status_code}")
            return False
        
        data = resp.json()
        videos = data.get("videos", [])
        if not videos:
            print(f"  [WARN] Pexels: nenhum video encontrado para '{keywords[:30]}'")
            return False
        
        # 2. Pegar o primeiro video HD disponivel
        video = videos[0]
        video_files = video.get("video_files", [])
        # Preferir HD (altura ~1080) ou o de melhor qualidade
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
        
        # 3. Baixar o video
        video_resp = http_req.get(video_url, timeout=timeout, stream=True)
        if video_resp.status_code != 200:
            return False
        
        with open(output_path, "wb") as f:
            for chunk in video_resp.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        if output_path.exists() and output_path.stat().st_size > 1024:
            print(f"  [B-ROLL] OK: {output_path.stat().st_size / 1024:.0f}KB")
            return True
        
        return False
        
    except Exception as e:
        print(f"  [WARN] B-ROLL error: {e}")
        return False


# -----------------------------------------------------------------------
# Groq Cloud (API gratuita) - Geracao de texto com JSON
# -----------------------------------------------------------------------

VIRAL_HOOK_SYSTEM_PROMPT = """Voce e um especialista em analise viral de videos do YouTube. 
Analise o conteudo do video e identifique os 3-5 melhores momentos (ganchos virais) 
que podem ser transformados em Shorts verticais de 15-60 segundos.

Para cada gancho, forneca:
1. O timestamp de inicio e fim em segundos
2. Uma descricao do gancho viral
3. Uma legenda em portugues brasileiro cativante para o Short

Responda ESTRITAMENTE no seguinte JSON (sem markdown, apenas JSON puro):
{
  "segments": [
    {
      "start": 12.5,
      "end": 35.0,
      "viral_hook": "Descricao do momento viral...",
      "caption": "Legenda cativante..."
    }
  ]
}"""

STUDIO_SCRIPT_SYSTEM_PROMPT = """Voce e um roteirista profissional de videos virais para Shorts e TikTok.
Crie um roteiro de 30 segundos dividido em 5 cenas de aproximadamente 6 segundos cada.

Para cada cena, forneca:
1. scene_description: Descricao visual da cena
2. duration: Duracao em segundos (aprox 6.0)
3. caption: Texto da legenda para aquela cena (em portugues brasileiro)
4. visual_prompt: Descricao detalhada do estilo visual, cores, iluminacao e atmosfera
5. character_ref: Descricao consistente do personagem principal

Mantenha consistencia de personagem e cenario em todas as cenas!

Responda ESTRITAMENTE no seguinte JSON (sem markdown):
{
  "scenes": [
    {
      "scene_index": 0,
      "scene_description": "...",
      "duration": 6.0,
      "caption": "...",
      "visual_prompt": "...",
      "character_ref": "..."
    }
  ]
}"""


def _call_groq_json(
    prompt: str,
    system_prompt: str,
    temperature: float = 0.7,
) -> dict | list:
    """
    Chama o Groq Cloud (API gratuita) com extracao JSON.
    Se nao houver chave, entra em modo simulado com dados realistas.
    """
    client = get_groq_client()

    if client is None:
        # --- MODO SIMULADO (funciona 100% sem API key) -------------
        print("  [SIMULATED] Groq:", prompt[:60].strip())
        time.sleep(0.8)

        if "ganchos virais" in system_prompt.lower():
            return {
                "segments": [
                    {"start": 12.5, "end": 35.0,
                     "viral_hook": "Momento de virada surpreendente que prende a atencao",
                     "caption": "Voce nao vai acreditar no que acontece depois! "},
                    {"start": 45.0, "end": 60.0,
                     "viral_hook": "Revelacao chocante com alto engajamento emocional",
                     "caption": "Isso muda tudo que voce sabia! "},
                    {"start": 78.3, "end": 95.0,
                     "viral_hook": "Dica pratica e inesperada que gera valor imediato",
                     "caption": "Salva esse video pra nao esquecer! "},
                ]
            }
        else:
            return {
                "scenes": [
                    {"scene_index": 0, "scene_description": "Abertura impactante com close-up dramatico",
                     "duration": 6.0, "caption": "Isso vai mudar sua perspectiva! [START] ",
                     "visual_prompt": "Close-up dramatico, iluminacao neon roxa e azul, contraste alto, cinematografico, textura granulada",
                     "character_ref": "Jovem de 25 anos, cabelos castanhos, olhos verdes, jaqueta jeans, estilo moderno"},
                    {"scene_index": 1, "scene_description": "Explicacao do conceito principal",
                     "duration": 6.0, "caption": "A ciencia explica por que isso funciona! ",
                     "visual_prompt": "Plano medio, fundo com infograficos sutis, iluminacao suave, tons azulados e tecnologicos",
                     "character_ref": "Jovem de 25 anos, cabelos castanhos, olhos verdes, jaqueta jeans"},
                    {"scene_index": 2, "scene_description": "Demonstracao pratica",
                     "duration": 6.0, "caption": "Veja como e simples na pratica! ",
                     "visual_prompt": "Close-up nas maos sobre mesa de madeira, iluminacao natural, profundidade de campo rasa, estilo tutorial",
                     "character_ref": "Maos do jovem, jaqueta jeans visivel"},
                    {"scene_index": 3, "scene_description": "Resultados impressionantes",
                     "duration": 6.0, "caption": "Os resultados falam por si! ",
                     "visual_prompt": "Jovem sorrindo segurando tablet, fundo de escritorio moderno, luz quente, plano americano",
                     "character_ref": "Jovem de 25 anos, jaqueta jeans, camiseta branca"},
                    {"scene_index": 4, "scene_description": "Encerramento com call to action",
                     "duration": 6.0, "caption": "Compartilha com quem precisa ver isso! ",
                     "visual_prompt": "Close-up extremo, olhando para camera, luz dramatica estilo retrato, fundo escuro gradiente",
                     "character_ref": "Jovem de 25 anos, olhos verdes, jaqueta jeans"},
                ]
            }

    # --- MODO REAL - Groq Cloud (API gratuita) ---------------------
    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        text = response.choices[0].message.content.strip()
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        return json.loads(text)
    except Exception as e:
        print(f"  [GROQ ERROR] {e}")
        raise


# -----------------------------------------------------------------------
# FFMPEG - Geracao Criativa de Cenas (substitui Veo + Imagen)
# -----------------------------------------------------------------------

# Paletas de cores por cena - cada cena tem um par (cor1, cor2) para gradiente
SCENE_COLORS = [
    ("#0f172a", "#1e3a5f"),  # Cena 0: azul escuro noturno
    ("#065f46", "#0d9488"),  # Cena 1: verde esmeralda
    ("#1e3a8a", "#3b82f6"),  # Cena 2: azul royal
    ("#5b21b6", "#8b5cf6"),  # Cena 3: roxo
    ("#991b1b", "#ef4444"),  # Cena 4: vermelho
    ("#831843", "#ec4899"),  # Cena 5: rosa
    ("#1c1917", "#44403c"),  # Cena 6: cinza escuro
    ("#172554", "#1d4ed8"),  # Cena 7: azul profundo
]


async def _generate_scene_audio(text: str, output_path: Path, timeout: int = 30) -> bool:
    """
    Gera audio de narracao TTS usando Edge TTS (gratuito, sem API key).
    Retorna True se conseguiu gerar, False caso contrario.
    """
    try:
        import edge_tts
        
        communicate = edge_tts.Communicate(text, "pt-BR-AntonioNeural")
        await communicate.save(str(output_path))
        
        if output_path.exists() and output_path.stat().st_size > 500:
            print(f"  [TTS] OK: {output_path.stat().st_size / 1024:.0f}KB")
            return True
        return False
    except Exception as e:
        print(f"  [WARN] TTS error: {e}")
        return False


def _generate_background_music(output_path: Path, duration: float = 30.0) -> bool:
    """
    Gera uma trilha de musica ambiente royalty-free usando sintese de audio do FFmpeg.
    Cria um pad suave em Am (Lá menor) com baixo drone + chord + shimmer,
    filtro low-pass e fade in/out para soar como musica de fundo relaxante.
    Retorna True se gerou com sucesso, False caso contrario.
    """
    try:
        duration = max(duration, 5.0)
        # Frequencias do acorde Am: A2 (110), C3 (130.81), E3 (164.81)
        # Baixo: A1 (55) uma oitava abaixo
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
        ret, _, stderr = run_ffmpeg(cmd, timeout=60)
        if ret == 0 and output_path.exists() and output_path.stat().st_size > 1000:
            print(f"  [BGM] Musica ambiente gerada: {output_path.stat().st_size / 1024:.0f}KB")
            return True
        print(f"  [WARN] BGM: falha ao gerar musica (ret={ret})")
        return False
    except Exception as e:
        print(f"  [WARN] BGM error: {e}")
        return False


def _generate_scene_video(
    output_path: Path,
    caption: str,
    duration: float,
    scene_index: int,
    broll_path: Path | None = None,
    audio_path: Path | None = None,) -> None:
    """
    Gera um video de cena usando FFmpeg.
    Se broll_path for fornecido, usa o video B-roll como fundo.
    Se audio_path for fornecido, mixa o audio no video.
    Caso contrario, usa cor solida e video sem audio.
    """
    duration = max(duration, 3.0)
    color1, _ = SCENE_COLORS[scene_index % len(SCENE_COLORS)]
    
    # --- Montar filtro de legenda (drawtext) ---
    drawtext_filter = ""
    if SYSTEM_FONT:
        safe_txt = caption.replace(chr(39), chr(92)+chr(39)).replace(':', chr(92)+':')
        font_p = SYSTEM_FONT.replace(':', '\\:')
        drawtext_filter = (
            f"drawtext=text='{safe_txt}':fontfile='{font_p}':"
            f"fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h-text_h-120:"
            f"shadowcolor=black@0.6:shadowx=3:shadowy=3"
        )
    
    # --- Video temporario sem audio ---
    temp_video = output_path.with_suffix(".tmp.mp4")
    
    if broll_path and broll_path.exists():
        scale_filter = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black"
        vf = f"{scale_filter},{drawtext_filter}" if drawtext_filter else scale_filter
        
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
        if drawtext_filter:
            ret, _, _ = run_ffmpeg([
                "-f", "lavfi",
                "-i", f"color=c={color1}:s=1080x1920:d={duration}:r=15",
                "-vf", drawtext_filter,
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "28",
                "-pix_fmt", "yuv420p",
                "-an",
                str(temp_video),
            ])
        else:
            ret, _, _ = run_ffmpeg([
                "-f", "lavfi",
                "-i", f"color=c={color1}:s=1080x1920:d={duration}:r=15",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "28",
                "-pix_fmt", "yuv420p",
                "-an",
                str(temp_video),
            ])
    
    if ret != 0 or not temp_video.exists():
        print("  [WARN] Erro ao gerar video, usando fallback")
        ret, _, _ = run_ffmpeg([
            "-f", "lavfi",
            "-i", f"color=c={color1}:s=1080x1920:d={duration}:r=15",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "28",
            "-pix_fmt", "yuv420p",
            str(temp_video),
        ])
        if ret != 0:
            with open(output_path, "wb") as f:
                f.write(b"\x00" * 1024)
            return
    
    # --- Mixar audio com video ---
    if audio_path and audio_path.exists():
        ret, _, _ = run_ffmpeg([
            "-i", str(temp_video),
            "-i", str(audio_path),
            "-c:v", "copy",
            "-c:a", "aac",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            str(output_path),
        ])
        if ret == 0:
            temp_video.unlink(missing_ok=True)
            return
        print("  [WARN] Erro ao mixar audio, mantendo video sem audio")
    
    # Fallback: video sem audio
    temp_video.rename(output_path)

# -----------------------------------------------------------------------
# API Routes
# -----------------------------------------------------------------------

@app.get("/api/health")
async def health():
    return HealthResponse(
        status="ok",
        version="1.1.0",
        ffmpeg_available=True,
        groq_configured=GROQ_API_KEY != "",
    )


@app.post("/api/clip/extract")
async def clip_extract(req: ClipExtractRequest):
    """
    Baixa um video do YouTube e extrai os melhores momentos para Shorts.
    Usa yt-dlp + Groq (simulado se sem chave) + FFmpeg.
    """
    job_id = f"clip-{uuid.uuid4().hex[:8]}"
    jobs[job_id] = {"status": "downloading", "progress": 10}

    try:
        # 1. Download com yt-dlp
        temp_dir = OUTPUT_DIR / job_id
        temp_dir.mkdir(parents=True, exist_ok=True)
        video_path = temp_dir / "source.mp4"

        jobs[job_id]["progress"] = 20
        subprocess.run(
            ["yt-dlp", "-f", "best[height<=1080]", "-o", str(video_path),
             "--no-playlist", "--quiet", req.youtube_url],
            capture_output=True, text=True, timeout=120, check=True,
        )

        if not video_path.exists():
            raise HTTPException(status_code=500, detail="Falha ao baixar video")

        jobs[job_id]["status"] = "analyzing"
        jobs[job_id]["progress"] = 45

        # 2. Analisar com Groq (modo simulado se sem chave)
        segments_data = _call_groq_json(
            prompt=f"Analise este video do YouTube: {req.youtube_url}",
            system_prompt=VIRAL_HOOK_SYSTEM_PROMPT,
        )

        # Extrair lista de segmentos (lida com dict {"segments": [...]} ou lista direta)
        segments_list = segments_data if isinstance(segments_data, list) else segments_data.get("segments", [])
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
            raise HTTPException(status_code=400, detail="Nenhum segmento encontrado")

        jobs[job_id]["segments"] = [s.model_dump() for s in segments]
        jobs[job_id]["status"] = "clipping"
        jobs[job_id]["progress"] = 60

        # 3. Cortar cada segmento com FFmpeg
        clips_dir = temp_dir / "clips"
        clips_dir.mkdir(exist_ok=True)
        clip_paths = []

        for i, seg in enumerate(segments):
            clip_out = clips_dir / f"clip_{i:03d}.mp4"
            ret, _, stderr = run_ffmpeg([
                "-ss", format_timestamp(seg.start),
                "-i", str(video_path),
                "-t", format_timestamp(seg.end - seg.start),
                "-vf", "crop=ih*9/16:ih,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-shortest",
                str(clip_out),
            ])
            if ret == 0 and clip_out.exists():
                clip_paths.append(str(clip_out))
            else:
                print(f"  [WARN] Falha ao cortar segmento {i}: {stderr[:200]}")

        if not clip_paths:
            raise HTTPException(status_code=500, detail="Falha ao gerar clipes")

        jobs[job_id]["progress"] = 85

        # 4. Concatenar clipes
        concat_path = temp_dir / "final.mp4"
        list_file = temp_dir / "list.txt"
        with open(list_file, "w") as f:
            for cp in clip_paths:
                f.write(f"file '{Path(cp).as_posix()}'\n")

        ret, _, stderr = run_ffmpeg([
            "-f", "concat",
            "-safe", "0",
            "-i", str(list_file),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            str(concat_path),
        ])

        if ret != 0 or not concat_path.exists():
            raise HTTPException(status_code=500, detail=f"Falha ao concatenar: {stderr[:200]}")

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
    except subprocess.TimeoutExpired:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = "Timeout ao baixar/processar video"
        return ClipExtractResponse(success=False, job_id=job_id, error="Timeout")
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)
        print(f"  [ERROR] clip_extract: {e}")
        return ClipExtractResponse(success=False, job_id=job_id, error=str(e))


@app.get("/api/clip/status/{job_id}")
async def clip_status(job_id: str):
    """Poll do progresso de um job de clipping."""
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
    """Download do video final de um job."""
    job = get_job(job_id)
    output_path = job.get("output_path")
    if not output_path or not Path(output_path).exists():
        raise HTTPException(status_code=404, detail="Arquivo nao encontrado")
    return FileResponse(output_path, media_type="video/mp4", filename="shorts_studio.mp4")


@app.post("/api/publish/shorts")
async def publish_shorts(req: PublishShortsRequest):
    """
    Publica no YouTube Shorts via OAuth.
    Retorna a URL de autenticacao para o usuario autorizar.
    """
    # Simula um fluxo OAuth2 - em producao integrar com google-api-python-client
    auth_url = f"https://accounts.google.com/o/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:8000/api/publish/callback&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload&state={req.job_id}"
    return {"auth_url": auth_url, "job_id": req.job_id, "title": req.title}


# -----------------------------------------------------------------------
# Studio / "Do Zero" Routes
# -----------------------------------------------------------------------

@app.post("/api/studio/script")
async def studio_script(req: StudioScriptRequest):
    """Gera um roteiro de 5 cenas a partir de uma ideia."""
    project_id = f"studio-{uuid.uuid4().hex[:8]}"

    try:
        scenes_data = _call_groq_json(
            prompt=f"Crie um roteiro de video curto sobre: {req.idea}",
            system_prompt=STUDIO_SCRIPT_SYSTEM_PROMPT,
        )

        scenes_list = scenes_data.get("scenes", scenes_data if isinstance(scenes_data, list) else [])
        if not scenes_list:
            raise HTTPException(status_code=500, detail="Falha ao gerar cenas")

        # Garantir que e uma lista
        if isinstance(scenes_list, dict):
            scenes_list = [scenes_list]

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

        # Salvar no jobs store
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
    """Gera o video de uma cena usando FFmpeg."""
    project_id = req.project_id
    scene_idx = req.scene_index

    try:
        scene_dir = OUTPUT_DIR / project_id / "scenes"
        scene_dir.mkdir(parents=True, exist_ok=True)

        output_path = scene_dir / f"scene_{scene_idx:03d}.mp4"
        broll_path = scene_dir / f"broll_{scene_idx:03d}.mp4"

        # Buscar B-roll do Pexels baseado no visual_prompt da cena
        broll_query = req.scene.visual_prompt or req.scene.scene_description
        has_broll = _search_and_download_broll(broll_query, broll_path)

        # Gerar audio TTS para a legenda da cena
        audio_path = scene_dir / f"audio_{scene_idx:03d}.mp3"
        has_audio = await _generate_scene_audio(req.scene.caption, audio_path)

        _generate_scene_video(
            output_path=output_path,
            caption=req.scene.caption,
            duration=req.scene.duration,
            scene_index=scene_idx,
            broll_path=broll_path if has_broll else None,
            audio_path=audio_path if has_audio else None,
        )

        if not output_path.exists():
            raise HTTPException(status_code=500, detail="Falha ao gerar video da cena")

        # Atualizar job
        if project_id in jobs:
            scenes = jobs[project_id].get("scenes_paths", [])
            scenes.append(str(output_path))
            jobs[project_id]["scenes_paths"] = scenes
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
    """Concatena todas as cenas em um video final."""
    project_id = req.project_id

    try:
        scene_dir = OUTPUT_DIR / project_id / "scenes"
        if not scene_dir.exists():
            raise HTTPException(status_code=404, detail="Cenas nao encontradas")

        video_files = sorted(scene_dir.glob("scene_*.mp4"))
        if not video_files:
            # Tentar pegar do jobs store
            if project_id in jobs:
                paths = jobs[project_id].get("scenes_paths", [])
                video_files = [Path(p) for p in paths if Path(p).exists()]

        if not video_files:
            raise HTTPException(status_code=404, detail="Nenhum video de cena encontrado")

        output_dir = OUTPUT_DIR / project_id
        output_dir.mkdir(parents=True, exist_ok=True)
        final_path = output_dir / "final.mp4"

        # Gerar musica de fundo (cache: gerar uma vez com 60s para cobrir qualquer projeto)
        bgm_path = OUTPUT_DIR / "_bgm.wav"
        if not bgm_path.exists():
            has_bgm = _generate_background_music(bgm_path, 60.0)
        else:
            has_bgm = True
            print(f"  [BGM] Usando musica em cache: {bgm_path}")

        # Criar arquivo de lista para concat
        list_file = output_dir / "concat_list.txt"
        with open(list_file, "w") as f:
            for vf in video_files:
                f.write(f"file '{vf.as_posix()}'\n")

        if has_bgm and bgm_path.exists():
            # Concat cenas + mixar background music em um comando FFmpeg
            # Tenta com amix primeiro; se falhar (ex: video sem audio), faz concat simples
            ret, _, stderr = run_ffmpeg([
                "-f", "concat",
                "-safe", "0",
                "-i", str(list_file),
                "-i", str(bgm_path),
                "-filter_complex",
                "[0:a]aformat=sample_rates=44100:channel_layouts=stereo[a0];"
                "[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.08[a1];"
                "[a0][a1]amix=inputs=2:duration=first[out]",
                "-map", "0:v",
                "-map", "[out]",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-pix_fmt", "yuv420p",
                "-shortest",
                str(final_path),
            ])
            if ret != 0:
                print("  [WARN] BGM amix falhou (video sem audio?), tentando concat simples")
                has_bgm = False  # Forcar fallback

        if not has_bgm or not bgm_path.exists():
            # Sem musica de fundo: concat simples
            ret, _, stderr = run_ffmpeg([
                "-f", "concat",
                "-safe", "0",
                "-i", str(list_file),
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-pix_fmt", "yuv420p",
                "-shortest",
                str(final_path),
            ])

        if ret != 0 or not final_path.exists():
            raise HTTPException(status_code=500, detail=f"Falha ao concatenar: {stderr[:200]}")

        # Atualizar job
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


if __name__ == "__main__":
    import uvicorn
    print(f" Shorts Studio API (Gratuita) rodando em http://{HOST}:{PORT}")
    uvicorn.run(
        "fastapi_backend:app",
        host=HOST,
        port=PORT,
        reload=True,
    )
