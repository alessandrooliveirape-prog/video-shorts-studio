import subprocess
import time
import requests
import sys
import os
from pathlib import Path

BASE = "http://127.0.0.1:8000"

def log(msg):
    print(f"[AUDIT] {msg}")
    sys.stdout.flush()

def main():
    log("Iniciando auditoria de todas as funções da API...")
    
    # 1. Iniciar servidor local em segundo plano
    log("Iniciando servidor local Uvicorn...")
    backend_dir = Path(__file__).parent
    server_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "fastapi_backend:app", "--port", "8000", "--host", "127.0.0.1"],
        cwd=str(backend_dir),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # 2. Aguardar o servidor responder ao Health Check
    health_url = f"{BASE}/api/health"
    server_ready = False
    for attempt in range(15):
        time.sleep(2)
        try:
            r = requests.get(health_url, timeout=5)
            if r.status_code == 200:
                log("Servidor iniciado com sucesso e respondendo!")
                print("  Health Response:", r.json())
                server_ready = True
                break
        except Exception:
            pass
        log(f"  Aguardando servidor... (tentativa {attempt+1}/15)")
        
    if not server_ready:
        log("ERRO: Servidor local não iniciou a tempo.")
        server_process.terminate()
        return 1
        
    errors = 0
    
    try:
        # 3. Teste do Roteiro (Studio Script)
        log("\n--- TESTANDO: Geração de Roteiro (Gemini) ---")
        script_url = f"{BASE}/api/studio/script"
        payload = {"idea": "3 curiosidades rápidas sobre cachorros", "visual_engine": "pexels"}
        
        t0 = time.time()
        r = requests.post(script_url, json=payload, timeout=60)
        elapsed = time.time() - t0
        
        if r.status_code == 200:
            data = r.json()
            if data.get("success"):
                log(f"SUCESSO: Roteiro gerado em {elapsed:.2f}s!")
                print("  Project ID:", data.get("projectId"))
                print("  Número de Cenas:", len(data.get("scenes", [])))
                project_id = data.get("projectId")
                scenes = data.get("scenes", [])
            else:
                log(f"FALHA: Roteiro retornou erro: {data.get('error')}")
                errors += 1
                project_id = None
        else:
            log(f"ERRO: Rota /api/studio/script retornou {r.status_code}")
            errors += 1
            project_id = None
            
        # 4. Teste de Cena Única (Studio Scene Generation)
        if project_id and scenes:
            log("\n--- TESTANDO: Geração de Vídeo de Cena Única (B-roll + TTS + FFmpeg) ---")
            scene_url = f"{BASE}/api/studio/generate-scene"
            scene_payload = {
                "project_id": project_id,
                "scene_index": 0,
                "scene": scenes[0],
                "all_scenes": scenes,
                "visual_engine": "pexels"
            }
            
            t0 = time.time()
            r = requests.post(scene_url, json=scene_payload, timeout=120)
            elapsed = time.time() - t0
            
            if r.status_code == 200:
                data = r.json()
                if data.get("success"):
                    log(f"SUCESSO: Vídeo da cena 0 gerado com sucesso em {elapsed:.2f}s!")
                    output_path = data.get("outputPath")
                    print("  Cena salva em:", output_path)
                    if output_path and os.path.exists(output_path):
                        print(f"  Tamanho do arquivo: {os.path.getsize(output_path)/1024:.2f} KB")
                    else:
                        log("FALHA: O arquivo de saída não existe fisicamente no disco.")
                        errors += 1
                else:
                    log(f"FALHA: Geração de cena retornou erro: {data.get('error')}")
                    errors += 1
            else:
                log(f"ERRO: Rota /api/studio/generate-scene retornou {r.status_code}")
                errors += 1
                
        # 5. Teste de Mesclagem Simples (Video Concat)
        log("\n--- TESTANDO: Rota de Concatenação de Vídeos ---")
        concat_url = f"{BASE}/api/video/concat"
        concat_payload = {
            "videoFiles": [],
            "audioEffect": "original",
            "titleText": "Teste de Auditoria",
            "transition_duration": 0.5,
            "transition_type": "fade"
        }
        r = requests.post(concat_url, json=concat_payload, timeout=30)
        if r.status_code == 200:
            log("SUCESSO: Endpoint de concatenação respondeu OK!")
        else:
            log(f"ERRO: Rota /api/video/concat retornou {r.status_code}")
            errors += 1
            
    finally:
        log("\nEncerrando servidor local Uvicorn...")
        server_process.terminate()
        server_process.wait()
        log("Servidor encerrado.")
        
    if errors == 0:
        log("\nAUDITORIA COMPLETA: Todas as funções principais da API estão funcionando com sucesso!")
        return 0
    else:
        log(f"\nAUDITORIA COMPLETA: Encontrados {errors} erro(s) nas rotas principais.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
