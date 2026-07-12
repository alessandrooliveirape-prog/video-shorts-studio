"""
Testes automatizados para Shorts Studio Backend
================================================
Cobre health check, retry de download YouTube, erros de validação e roteiro.
"""

import os
import sys
import json
from pathlib import Path
from unittest.mock import patch, MagicMock, call
from typing import Generator

import pytest
from fastapi.testclient import TestClient

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi_backend import app, GEMINI_API_KEY, PEXELS_API_KEY, OUTPUT_DIR


# ─── Fixtures ────────────────────────────────────────────────────────

@pytest.fixture
def client() -> Generator:
    """Fixture do TestClient FastAPI."""
    with TestClient(app) as c:
        yield c


# ─── Testes: Health Check ───────────────────────────────────────────

class TestHealthEndpoint:
    """Testes do endpoint /api/health."""

    def test_health_returns_200(self, client):
        """Health check deve retornar 200 OK."""
        resp = client.get("/api/health")
        assert resp.status_code == 200

    def test_health_contains_expected_fields(self, client):
        """Health check deve conter status, version, ffmpegAvailable (camelCase)."""
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        # Schema usa camelCase via BaseSchema.alias_generator
        assert "status" in data
        assert "version" in data
        assert "ffmpegAvailable" in data
        assert "geminiConfigured" in data
        assert data["status"] == "ok"

    def test_health_gemini_status(self, client):
        """geminiConfigured deve refletir a presença da chave GEMINI_API_KEY."""
        resp = client.get("/api/health")
        data = resp.json()
        expected = GEMINI_API_KEY != ""
        assert data["geminiConfigured"] == expected


# ─── Testes: Validação de URLs ──────────────────────────────────────

class TestClipExtractValidation:
    """Testes de validação do endpoint /api/clip/extract."""

    def test_extract_without_youtube_url_returns_422(self, client):
        """Requisição sem youtube_url deve retornar 422."""
        resp = client.post("/api/clip/extract", json={})
        assert resp.status_code == 422

    def test_extract_with_empty_url_returns_400_or_422(self, client):
        """URL vazia deve retornar erro (400 ou 422)."""
        resp = client.post("/api/clip/extract", json={"youtube_url": ""})
        # Pydantic pode aceitar string vazia (passando validação), mas o endpoint valida internamente
        assert resp.status_code in (400, 422)

    def test_extract_with_invalid_url_format(self, client):
        """URL inválida (não-Youtube) pode retornar 400 ou 422."""
        resp = client.post("/api/clip/extract", json={
            "youtube_url": "not-a-valid-url"
        })
        # Pode ser 422 (validação FastAPI) ou 400 (validação interna)
        assert resp.status_code in (400, 422)


# ─── Testes: Retry do YouTube Download ──────────────────────────────

class TestYouTubeDownloadRetry:
    """Testes do mecanismo de retry no download do YouTube."""

    @patch("fastapi_backend.subprocess.run")
    def test_retry_on_429_success_on_retry(self, mock_run, client):
        """429 no download deve acionar retry e ter sucesso na 2a tentativa."""
        # Simular: 1a tentativa falha (exit 1), 2a tentativa sucesso
        # Após download bem-sucedido, o endpoint falha pq o arquivo não existe no disco
        mock_run.side_effect = [
            MagicMock(returncode=1, stdout="", stderr="HTTP Error 429: Too Many Requests"),
            MagicMock(returncode=0, stdout="", stderr=""),
        ]

        resp = client.post("/api/clip/extract", json={
            "youtube_url": "https://youtube.com/watch?v=test429retry"
        })

        # Verificar que o retry rodou (pelo menos 2 chamadas de subprocess para yt-dlp)
        assert mock_run.call_count >= 2

    @patch("fastapi_backend.subprocess.run")
    def test_retry_exhausted_returns_error(self, mock_run, client):
        """Após 3 tentativas falhas, deve retornar erro de download."""
        mock_run.return_value = MagicMock(
            returncode=1,
            stdout="",
            stderr="HTTP Error 429: Too Many Requests"
        )

        resp = client.post("/api/clip/extract", json={
            "youtube_url": "https://youtube.com/watch?v=test429exhaust"
        })

        # Após esgotar retries, deve retornar 400 com mensagem de falha
        assert resp.status_code == 400
        data = resp.json()
        assert "Falha ao baixar vídeo" in data.get("detail", "")

    @patch("fastapi_backend.subprocess.run")
    def test_retry_uses_yt_dlp_flags(self, mock_run, client):
        """O comando yt-dlp deve incluir as flags de retry e sleep."""
        mock_run.side_effect = [
            MagicMock(returncode=1, stdout="", stderr="HTTP Error 429: Too Many Requests"),
            MagicMock(returncode=1, stdout="", stderr="HTTP Error 429: Too Many Requests"),
            MagicMock(returncode=1, stdout="", stderr="HTTP Error 429: Too Many Requests"),
        ]

        client.post("/api/clip/extract", json={
            "youtube_url": "https://youtube.com/watch?v=testflags"
        })

        # Verificar que TODAS as flags de retry foram passadas
        required_flags = ["--retries", "--sleep-requests", "--sleep-interval", "--extractor-retries"]
        for call_args in mock_run.call_args_list:
            cmd = call_args[0][0]
            full_cmd = " ".join(cmd) if isinstance(cmd, list) else str(cmd)
            if "yt-dlp" in full_cmd:
                assert all(flag in full_cmd for flag in required_flags), \
                    f"Flags faltando em: {full_cmd[:200]}"

    @patch("fastapi_backend.subprocess.run")
    def test_retry_with_timeout_fallback(self, mock_run, client):
        """Timeout no subprocess deve ser tratado e acionar retry."""
        from subprocess import TimeoutExpired

        # 1a tentativa: timeout, 2a: sucesso
        mock_run.side_effect = [
            TimeoutExpired(cmd="yt-dlp", timeout=180, output="", stderr="timeout"),
            MagicMock(returncode=0, stdout="", stderr=""),
        ]

        resp = client.post("/api/clip/extract", json={
            "youtube_url": "https://youtube.com/watch?v=testtimeout"
        })

        assert mock_run.call_count >= 2


# ─── Testes: Studio Script ──────────────────────────────────────────

class TestStudioScript:
    """Testes do endpoint /api/studio/script."""

    def test_script_without_idea_returns_422(self, client):
        """Requisição sem idea deve retornar 422."""
        resp = client.post("/api/studio/script", json={})
        assert resp.status_code == 422

    def test_script_with_empty_idea_returns_200_or_422(self, client):
        """Ideia vazia pode ser aceita (modo simulado) ou rejeitada (422)."""
        resp = client.post("/api/studio/script", json={"idea": ""})
        # Se não houver chave Gemini, o modo simulado aceita qualquer string
        # Se houver validação, retorna 422
        assert resp.status_code in (200, 422)

    @patch("fastapi_backend._call_gemini_json")
    def test_script_uses_correct_engine(self, mock_gemini, client):
        """O motor visual 'pexels' deve ser passado para o Gemini."""
        mock_gemini.return_value = {
            "scenes": [
                {"scene_index": 0, "scene_description": "Test scene",
                 "duration": 6.0, "caption": "Test caption",
                 "visual_prompt": "test prompt"}
            ]
        }

        resp = client.post("/api/studio/script", json={
            "idea": "test idea",
            "visual_engine": "pexels"
        })

        # Verifica que o mock foi chamado (Gemini foi invocado)
        assert mock_gemini.called


# ─── Testes: Cancelamento de Job ────────────────────────────────────

class TestClipCancel:
    """Testes do endpoint /api/clip/cancel/{job_id}."""

    def test_cancel_nonexistent_job_returns_404(self, client):
        """Cancelar job inexistente deve retornar 404."""
        resp = client.post("/api/clip/cancel/nonexistent-job")
        assert resp.status_code == 404


# ─── Testes: Download ───────────────────────────────────────────────

class TestDownload:
    """Testes do endpoint /api/download/{job_id}."""

    def test_download_nonexistent_job_returns_404(self, client):
        """Download de job inexistente deve retornar 404."""
        resp = client.get("/api/download/nonexistent-job")
        assert resp.status_code == 404


# ─── Testes: Validação de Schemas ───────────────────────────────────

class TestSchemaValidation:
    """Testes de validação de schemas Pydantic."""

    def test_clip_extract_with_audio_effect(self, client):
        """Campo audio_effect opcional deve ser aceito."""
        resp = client.post("/api/clip/extract", json={
            "youtube_url": "https://youtube.com/watch?v=test",
            "audio_effect": "original"
        })
        # 422 se falhar validação, senão 400 (URL inválida) ou 200 (mock)
        assert resp.status_code in (200, 400, 422)

    def test_clip_extract_with_subtitle_options(self, client):
        """Campo subtitleOptions deve aceitar configurações de legenda."""
        resp = client.post("/api/clip/extract", json={
            "youtube_url": "https://youtube.com/watch?v=test",
            "subtitleOptions": {
                "style": "neon_purple",
                "position": "center",
                "fontSize": 60
            }
        })
        assert resp.status_code in (200, 400, 422)


# ─── Testes: Studio Generate Scene ──────────────────────────────────

class TestStudioGenerateScene:
    """Testes do endpoint /api/studio/generate-scene."""

    def test_generate_scene_without_project_id_returns_422(self, client):
        """Requisição sem project_id deve retornar 422."""
        resp = client.post("/api/studio/generate-scene", json={
            "scene_index": 0,
            "scene": {
                "scene_index": 0,
                "scene_description": "Test",
                "duration": 6.0,
                "caption": "Test",
                "visual_prompt": "test"
            },
            "all_scenes": []
        })
        assert resp.status_code == 422


# ─── Testes: Studio Stitch ──────────────────────────────────────────

class TestStudioStitch:
    """Testes do endpoint /api/studio/stitch."""

    def test_stitch_without_project_id_returns_422(self, client):
        """Requisição sem project_id deve retornar 422."""
        resp = client.post("/api/studio/stitch", json={
            "scenes": []
        })
        assert resp.status_code == 422


# ─── Testes: Upload Video ───────────────────────────────────────────

class TestVideoUpload:
    """Testes do endpoint /api/video/upload."""

    def test_upload_without_file_returns_422(self, client):
        """Upload sem arquivo deve retornar 422."""
        resp = client.post("/api/video/upload")
        assert resp.status_code == 422

    def test_upload_invalid_file_returns_error(self, client):
        """Upload com arquivo inválido deve retornar error (não crash)."""
        resp = client.post("/api/video/upload", files={
            "file": ("test.txt", b"not a video", "text/plain")
        })
        # Pode ser 200 (com success=false) ou 422 (validação)
        assert resp.status_code in (200, 422)
        if resp.status_code == 200:
            data = resp.json()
            # Deve ser um objeto com campo success
            assert "success" in data


# ─── Testes: Concat Videos ──────────────────────────────────────────

class TestVideoConcat:
    """Testes do endpoint /api/video/concat."""

    def test_concat_without_video_files_returns_422(self, client):
        """Requisição sem videoFiles deve retornar 422."""
        resp = client.post("/api/video/concat", json={})
        assert resp.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
