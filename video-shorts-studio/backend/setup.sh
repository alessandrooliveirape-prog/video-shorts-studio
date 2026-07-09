#!/usr/bin/env bash
set -euo pipefail

# ─── Shorts Studio — Setup Automático ───────────────────────────────
# Este script configura o ambiente completo para o backend Python.

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════╗"
echo "║       Shorts Studio — Setup Automático       ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"

# ─── 1. Verificar / Instalar FFmpeg ─────────────────────────────────

echo -e "${YELLOW}[1/4] Verificando FFmpeg...${NC}"

if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n 1 | grep -oP '\d+\.\d+' | head -1)
    echo -e "  ${GREEN}✓ FFmpeg ${FFMPEG_VERSION} encontrado${NC}"
else
    echo -e "  ${YELLOW}⚠ FFmpeg não encontrado. Instalando...${NC}"

    # Detect OS
    case "$(uname -s)" in
        Linux*)
            echo "  → Detectado Linux. Use seu gerenciador de pacotes:"
            echo "    sudo apt install ffmpeg   # Debian/Ubuntu"
            echo "    sudo pacman -S ffmpeg     # Arch"
            echo "    sudo dnf install ffmpeg   # Fedora"
            ;;
        Darwin*)
            echo "  → Detectado macOS. Instalando via Homebrew..."
            if command -v brew &> /dev/null; then
                brew install ffmpeg
                echo -e "  ${GREEN}✓ FFmpeg instalado com Homebrew${NC}"
            else
                echo -e "  ${RED}✗ Homebrew não encontrado. Instale: https://brew.sh${NC}"
                echo "    Depois execute: brew install ffmpeg"
                exit 1
            fi
            ;;
        MINGW*|MSYS*|CYGWIN*)
            echo "  → Detectado Windows (Git Bash). Instalando via winget..."
            if command -v winget &> /dev/null; then
                winget install "FFmpeg (Essentials Build)" --accept-package-agreements
                echo -e "  ${GREEN}✓ FFmpeg instalado com winget${NC}"
            else
                echo -e "  ${YELLOW}⚠ winget não disponível. Instale manualmente:${NC}"
                echo "    https://ffmpeg.org/download.html"
                echo "    Ou via Chocolatey: choco install ffmpeg"
            fi
            ;;
        *)
            echo -e "  ${YELLOW}⚠ OS não reconhecido. Instale FFmpeg manualmente: https://ffmpeg.org${NC}"
            ;;
    esac
fi

# ─── 2. Criar Ambiente Virtual Python ────────────────────────────────

echo -e "${YELLOW}[2/4] Configurando ambiente virtual Python...${NC}"

if [ -d "venv" ]; then
    echo -e "  ${GREEN}✓ Ambiente virtual já existe${NC}"
else
    python3 -m venv venv 2>/dev/null || python -m venv venv
    echo -e "  ${GREEN}✓ Ambiente virtual criado em ./venv${NC}"
fi

# Activate
if [[ "$(uname -s)" == MINGW* || "$(uname -s)" == MSYS* ]]; then
    source venv/Scripts/activate 2>/dev/null || . venv/Scripts/activate
else
    source venv/bin/activate 2>/dev/null || . venv/bin/activate
fi

echo -e "  ${GREEN}✓ Ambiente virtual ativado${NC}"

# ─── 3. Instalar Dependências Python ────────────────────────────────

echo -e "${YELLOW}[3/4] Instalando dependências Python...${NC}"

pip install --upgrade pip -q
pip install -r requirements.txt -q

echo -e "  ${GREEN}✓ Dependências instaladas com sucesso${NC}"

# ─── 4. Verificar Configuração ──────────────────────────────────────

echo -e "${YELLOW}[4/4] Verificando configuração...${NC}"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "  ${YELLOW}⚠ Arquivo .env criado a partir de .env.example${NC}"
        echo -e "  ${YELLOW}  → Edite .env com sua GOOGLE_API_KEY${NC}"
    fi
else
    echo -e "  ${GREEN}✓ Arquivo .env encontrado${NC}"
fi

# Test imports
python -c "
try:
    import fastapi
    import uvicorn
    import google.genai as genai
    import yt_dlp
    import dotenv
    print('  ✓ Todos os imports funcionando')
except ImportError as e:
    print(f'  ✗ Erro de import: {e}')
" 2>&1 || true

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║       Setup concluído com sucesso! 🚀        ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Para iniciar o servidor:"
echo -e "    ${CYAN}source venv/bin/activate${NC} (Linux/macOS)"
echo -e "    ${CYAN}source venv/Scripts/activate${NC} (Windows)"
echo -e "    ${CYAN}uvicorn fastapi_backend:app --reload --port 8000${NC}"
echo ""
echo -e "  Não esqueça de configurar a GOOGLE_API_KEY no arquivo .env"
echo ""
