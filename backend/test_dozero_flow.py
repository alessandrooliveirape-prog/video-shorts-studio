"""
Teste do Fluxo 'Do Zero' — Shorts Studio
=========================================
Gera um roteiro, cria 5 cenas com FFmpeg e concatena em um vídeo final.
"""
import json, time, sys, os, requests
from pathlib import Path

BASE = "http://localhost:8000"
OUTPUT_DIR = Path(__file__).parent / "outputs"

def log(msg):
    print(f"  {msg}")
    sys.stdout.flush()

def main():
    idea = "Dicas rapidas de produtividade para programadores usando pomodoro"
    
    # ─── Step 1: Gerar Roteiro ──────────────────────────────────────
    log("[1/4] Gerando roteiro com Groq (modo simulado)...")
    r = requests.post(f"{BASE}/api/studio/script", json={"idea": idea}, timeout=60)
    r.raise_for_status()
    script_data = r.json()
    
    if not script_data.get("success"):
        log(f"ERRO: {script_data.get('error', 'unknown')}")
        return 1
    
    project_id = script_data.get("projectId") or script_data.get("project_id")
    scenes = script_data["scenes"]
    log(f"  Project ID: {project_id}")
    log(f"  Cenas geradas: {len(scenes)}")
    for s in scenes:
        scene_idx = s.get('sceneIndex', s.get('scene_index', 0))
        scene_desc = s.get('sceneDescription', s.get('scene_description', ''))
        duration = s.get('duration', 6.0)
        log(f"    Cena {scene_idx+1}: {scene_desc[:40]}... ({duration}s)")
    
    # ─── Step 2: Gerar Cenas ────────────────────────────────────────
    log("\n[2/4] Gerando cenas com FFmpeg...")
    for i, scene in enumerate(scenes):
        log(f"  Renderizando cena {i+1}/{len(scenes)}...")
        t0 = time.time()
        r = requests.post(f"{BASE}/api/studio/generate-scene", json={
            "project_id": project_id,
            "scene_index": i,
            "scene": scene,
            "all_scenes": scenes,
        }, timeout=120)
        r.raise_for_status()
        gen_data = r.json()
        
        if gen_data.get("success"):
            elapsed = time.time() - t0
            output_path = gen_data.get("outputPath") or gen_data.get("output_path", "")
            size = os.path.getsize(output_path) if output_path and os.path.exists(output_path) else 0
            log(f"    Cena {i+1} OK — {elapsed:.1f}s, {size/1024:.0f}KB")
        else:
            log(f"    Cena {i+1} ERRO: {gen_data.get('error', 'unknown')}")
    
    # ─── Step 3: Concatenar ─────────────────────────────────────────
    log("\n[3/4] Concatendando cenas...")
    r = requests.post(f"{BASE}/api/studio/stitch", json={
        "project_id": project_id,
        "scenes": scenes,
    }, timeout=120)
    r.raise_for_status()
    stitch_data = r.json()
    
    if not stitch_data.get("success"):
        log(f"ERRO stitch: {stitch_data.get('error', 'unknown')}")
        return 1
    
    output_path = stitch_data.get("outputPath") or stitch_data.get("output_path", "")
    final_size = os.path.getsize(output_path) if output_path and os.path.exists(output_path) else 0
    
    # ─── Step 4: Verificar ──────────────────────────────────────────
    log("\n[4/4] Verificando vídeo final...")
    log(f"  Output: {output_path}")
    log(f"  Tamanho: {final_size/1024:.0f} KB ({final_size:.0f} bytes)")
    
    if final_size > 5000:  # >5KB = vídeo real
        log("  STATUS: [OK] VIDEO GERADO COM SUCESSO!")
    elif final_size > 0:
        log("  STATUS: [WARN] Arquivo gerado, mas muito pequeno")
    else:
        log("  STATUS: [ERRO] ARQUIVO VAZIO OU NAO ENCONTRADO")
        return 1
    
    # ─── Info final ─────────────────────────────────────────────────
    total_duration = sum(s["duration"] for s in scenes)
    log(f"\n  Resumo:")
    log(f"  |-- Projeto: {project_id}")
    log(f"  |-- Cenas: {len(scenes)}")
    log(f"  |-- Duracao: {total_duration:.0f}s")
    log(f"  |-- Tamanho: {final_size/1024:.0f} KB")
    log(f"  +-- Arquivo: {output_path}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
