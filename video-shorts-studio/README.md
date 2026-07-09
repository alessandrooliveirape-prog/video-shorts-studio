# 🎬 Shorts Studio — Criação e Clipping de Vídeos para Shorts/TikTok

**Shorts Studio** é um Web App full-stack que utiliza **Google Gemini Free Tier** e **FFmpeg** para criar vídeos verticais (9:16) profissionais para YouTube Shorts e TikTok.

## 🆓 100% Gratuito — Sem Cartão de Crédito

| API/Serviço | Custo | Cartão necessário |
|-------------|-------|:---:|
| **Google Gemini** (texto) | **Grátis** | ❌ Não |
| **FFmpeg** (local) | **Grátis** | ❌ Não |
| **yt-dlp** (download) | **Grátis** | ❌ Não |
| ~~Veo 3.1 / Imagen~~ | ~~Pago~~ | Removido |

> Obtenha sua chave Gemini gratuita: https://aistudio.google.com/apikey

---

## ✨ Funcionalidades

### 🔹 Clipping do YouTube
- Cole qualquer URL do YouTube e a IA encontra automaticamente os **melhores ganchos virais**
- Download seguro com `yt-dlp`
- Corte preciso na proporção **9:16** com crop centralizado via FFmpeg
- Detecção inteligente de timestamps com **Gemini (Free Tier)**

### 🔹 Estúdio "Do Zero"
- Descreva uma ideia e o **Gemini (Free Tier)** gera um **roteiro completo de 30s** em 5 cenas
- Geração de cenas com **FFmpeg**: gradientes animados, legendas com drawtext, efeito Ken Burns
- Concatenação limpa via FFmpeg com `-c copy`

### 🔹 Interface Premium
- Tema **Frosted Glass** (Slate & Emerald)
- Simulador de **smartphone vertical interativo**
- Legendas dinâmicas geradas por IA
- Preview em tempo real

### 🔹 Exportação
- Download do Short em MP4
- Publicação no YouTube Shorts (OAuth2 via browser)

---

## 🚀 Instalação e Setup

### Pré-requisitos
- **Node.js** 18+
- **Python** 3.10+
- **FFmpeg** (instalação automática no setup.sh)

### 1. Instalar dependências do frontend

```bash
cd video-shorts-studio
npm install
```

### 2. Configurar backend automaticamente

```bash
# Linux/macOS
bash backend/setup.sh

# Windows (Git Bash)
bash backend/setup.sh
```

O script `setup.sh` faz tudo automaticamente:
- ✅ Verifica/instala FFmpeg (winget no Windows, brew no macOS)
- ✅ Cria ambiente virtual Python (venv)
- ✅ Instala todas as dependências Python
- ✅ Cria arquivo `.env` a partir do template

### 3. (Opcional) Configurar chave Gemini

Edite `backend/.env` e adicione sua chave:
```env
GOOGLE_API_KEY=sua_chave_gratuita_do_google_ai_studio
```

**O app funciona perfeitamente no modo simulado sem chave alguma.**

### 4. Iniciar

**Terminal 1 — Backend:**
```bash
cd backend
source venv/bin/activate   # Linux/macOS
source venv/Scripts/activate  # Windows
uvicorn fastapi_backend:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

## 🔌 API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/health` | Status do servidor |
| `POST` | `/api/clip/extract` | Iniciar clipping de YouTube |
| `GET` | `/api/clip/status/{job_id}` | Status do clipping |
| `POST` | `/api/studio/script` | Gerar roteiro com Gemini |
| `POST` | `/api/studio/generate-scene` | Gerar cena com FFmpeg |
| `POST` | `/api/studio/stitch` | Concatenar cenas |
| `GET` | `/api/download/{job_id}` | Download do vídeo |
| `POST` | `/api/publish/shorts` | Publicar no YouTube Shorts |

---

## 🧠 Stack Tecnológica

**Frontend:**
- React 19 + TypeScript
- Tailwind CSS 4 (Frosted Glass Theme)
- Motion (animações) + Lucide React (ícones)
- Vite 6

**Backend:**
- Python FastAPI + Uvicorn
- Google Generative AI SDK (Gemini Free Tier)
- yt-dlp (download YouTube)
- FFmpeg (corte 9:16, geração de cenas, concatenação)
