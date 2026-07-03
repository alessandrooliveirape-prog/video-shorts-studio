/* ============================================
   PLEASUREHUB - Auto Updater
   Adiciona automaticamente 2 novos vídeos por dia
   
   Agendamento:
   - Windows: Agendador de Tarefas
   - Linux: cron
   - PM2: pm2 start auto-update.mjs --cron "0 */12 * * *"
   
   Modos:
     node auto-update.mjs           # Modo normal: 2 vídeos
     node auto-update.mjs --count=5 # Personalizado: 5 vídeos
     node auto-update.mjs --once    # Executar uma vez e sair
     node auto-update.mjs --daemon  # Ficar rodando (check a cada 12h)
   ============================================ */

import { execSync } from 'child_process';
import { appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LOG_FILE = join(__dirname, 'auto-update.log');

// ============================================
// LOGGING
// ============================================

function log(message) {
  const timestamp = new Date().toLocaleString('pt-BR');
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  try {
    appendFileSync(LOG_FILE, line + '\n');
  } catch(e) {}
}

// ============================================
// RUN SCRAPER
// ============================================

async function runScraper(count = 2) {
  const scraperPath = join(__dirname, 'scraper.mjs');
  
  log(`🚀 Iniciando atualização automática: +${count} vídeos`);  try {
      const stdout = execSync(`node "${scraperPath}" --daily=${count}`, {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 60000, // 60 segundos timeout
    });
    
    log('✅ Scraper executado com sucesso!');
    
    // Extrair informações relevantes do output
    const lines = stdout.split('\n').filter(l => l.includes('➕') || l.includes('❌') || l.includes('✅ SCRAPE'));
    lines.forEach(l => log(l.trim()));
    
    return { success: true, output: stdout };
  } catch (err) {
    log(`❌ Erro ao executar scraper: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ============================================
// DAEMON MODE (roda eternamente com intervalo)
// ============================================

function runDaemon(count = 2, intervalHours = 12) {
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  log(`🔄 MODO DAEMON: verificando a cada ${intervalHours}h`);
  log(`📊 Adicionando ${count} vídeos por execução`);
  log('⏸️  Pressione Ctrl+C para parar');
  console.log('');
  
  // Executar imediatamente
  runScraper(count);
  
  // Depois executar em intervalo
  setInterval(() => {
    runScraper(count);
  }, intervalMs);
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);
  
  console.log(`
╔══════════════════════════════════════════════╗
║     PLEASUREHUB - AUTO UPDATER v1.0         ║
╚══════════════════════════════════════════════╝
`);
  
  const countArg = args.find(a => a.startsWith('--count='));
  const count = countArg ? parseInt(countArg.split('=')[1]) : 2;
  
  if (args.includes('--daemon')) {
    runDaemon(count);
    return;
  }
  
  if (args.includes('--once') || args.length === 0) {
    await runScraper(count);
    log('✅ Auto-update concluído!');
    process.exit(0);
  }
  
  // Help
  console.log(`
USO:
  node auto-update.mjs [opções]

OPÇÕES:
  --count=N     Número de vídeos por atualização (padrão: 2)
  --once        Executar uma vez e sair (padrão)
  --daemon      Ficar rodando em loop (check a cada 12h)

EXEMPLOS:
  node auto-update.mjs                    # 2 vídeos, execução única
  node auto-update.mjs --daemon           # Loop infinito a cada 12h
  node auto-update.mjs --count=5 --once   # 5 vídeos, execução única

AGENDAMENTO RECOMENDADO:
  Windows (Agendador de Tarefas):
    schtasks /create /tn "PleasureHubUpdate" /tr "node C:\caminho\adult-site\scraper\auto-update.mjs" /sc daily /st 06:00 /f
    
    Ou manualmente: Abrir Task Scheduler → Criar Tarefa → 
    Ação: iniciar programa "node" com argumento "scraper/auto-update.mjs"
    Disparador: Diariamente às 06:00
    Pasta de trabalho: C:\caminho\adult-site\
  
  Linux (cron):
    crontab -e → 0 */12 * * * cd /caminho/adult-site && node scraper/auto-update.mjs
  
  PM2:
    pm2 start scraper/auto-update.mjs --cron "0 */12 * * *" --name pleasurehub-updater
`);
}

main();
