import { Scissors, Sparkles, Menu, X, Film, Upload, Sun, Moon, Palette } from 'lucide-react';
import { motion } from 'motion/react';
import { AppTab } from '@/src/types';

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  menuOpen: boolean;
  onMenuToggle: () => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  accent: string;
  onAccentChange: () => void;
}

export default function Header({ activeTab, onTabChange, menuOpen, onMenuToggle, theme, onThemeToggle, accent, onAccentChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40">
      <div className="glass-card border-b border-slate-800/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-900 rounded-lg cursor-pointer transition-all"
            >
              {menuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
            </button>
            <div className="flex items-center gap-2.5 select-none">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-md shadow-violet-500/30">
                <Scissors className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-100 font-display tracking-tight leading-none">
                  Shorts Studio
                </h1>
                <span className="text-[9px] font-semibold text-slate-400 font-mono tracking-wider">
                  CRIADOR DE VÍDEOS IA
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs - Desktop (centered) */}
          <nav className="hidden md:flex items-center bg-slate-900/50 rounded-xl p-1 border border-slate-800/80">
            <TabButton
              active={activeTab === 'clip'}
              onClick={() => onTabChange('clip')}
              icon={<Scissors className="w-3.5 h-3.5" />}
              label="Clipping YouTube"
            />
            <TabButton
              active={activeTab === 'upload-clip'}
              onClick={() => onTabChange('upload-clip')}
              icon={<Upload className="w-3.5 h-3.5" />}
              label="Upload & Cortar"
            />
            <TabButton
              active={activeTab === 'studio'}
              onClick={() => onTabChange('studio')}
              icon={<Sparkles className="w-3.5 h-3.5" />}
              label="Do Zero (IA)"
            />
            <TabButton
              active={activeTab === 'concat'}
              onClick={() => onTabChange('concat')}
              icon={<Film className="w-3.5 h-3.5" />}
              label="Mesclar Vídeos"
            />
          </nav>

          {/* Theme toggle + Accent + Version */}
          <div className="flex items-center gap-1.5">
            {/* Accent color cycler */}
            <button
              onClick={onAccentChange}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 transition-all cursor-pointer"
              title="Mudar cor de destaque"
            >
              <Palette className="w-4 h-4" style={{ color: accent === 'violet' ? '#a78bfa' : accent === 'pink' ? '#f9a8d4' : accent === 'green' ? '#6ee7b7' : accent === 'amber' ? '#fcd34d' : '#67e8f9' }} />
            </button>
            {/* Theme toggle */}
            <button
              onClick={onThemeToggle}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 transition-all cursor-pointer"
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <span className="text-[9px] font-mono font-bold px-2 py-1 rounded-lg border hidden sm:inline" style={{
              color: 'var(--theme-accent)',
              backgroundColor: 'color-mix(in srgb, var(--theme-accent) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--theme-accent) 20%, transparent)',
            }}>
              v1.3.0
            </span>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-md px-4 py-3"
          >
            <div className="flex flex-col gap-1">
              <MobileTabButton
                active={activeTab === 'clip'}
                onClick={() => {
                  onTabChange('clip');
                  onMenuToggle();
                }}
                icon={<Scissors className="w-4 h-4" />}
                label="Clipping do YouTube"
                desc="Extraia Shorts de vídeos longos"
              />
              <MobileTabButton
                active={activeTab === 'upload-clip'}
                onClick={() => {
                  onTabChange('upload-clip');
                  onMenuToggle();
                }}
                icon={<Upload className="w-4 h-4" />}
                label="Upload & Cortar"
                desc="Envie vídeo e IA seleciona os melhores trechos"
              />
              <MobileTabButton
                active={activeTab === 'studio'}
                onClick={() => {
                  onTabChange('studio');
                  onMenuToggle();
                }}
                icon={<Sparkles className="w-4 h-4" />}
                label="Estúdio do Zero"
                desc="Gere vídeos completos com IA"
              />
              <MobileTabButton
                active={activeTab === 'concat'}
                onClick={() => {
                  onTabChange('concat');
                  onMenuToggle();
                }}
                icon={<Film className="w-4 h-4" />}
                label="Mesclar Vídeos"
                desc="Suba e junte seus próprios clipes"
              />
            </div>
          </motion.div>
        )}
      </div>
    </header>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
        active
          ? 'text-white'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
      }`}
    >
      {active && (
        <motion.div
          layoutId="nav-pill"
          className="absolute inset-0 bg-slate-800/90 rounded-lg border border-slate-700/50"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </button>
  );
}

function MobileTabButton({
  active,
  onClick,
  icon,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
        active ? 'bg-violet-950/20 border border-violet-500/30' : 'hover:bg-slate-900/30 border border-transparent'
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
        active ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-900 text-slate-400'
      }`}>
        {icon}
      </div>
      <div>
        <span className={`text-xs font-bold ${active ? 'text-violet-300' : 'text-slate-300'}`}>
          {label}
        </span>
        <p className="text-[9px] text-slate-400 font-medium">{desc}</p>
      </div>
    </button>
  );
}
