import { motion } from 'motion/react';
import { Play, Image, GripVertical, Trash2, Clock, Sparkles } from 'lucide-react';
import { SceneScript } from '@/src/types';

interface SceneBlockProps {
  scene: SceneScript;
  index: number;
  isActive?: boolean;
  onDelete?: (index: number) => void;
  onClick?: (index: number) => void;
}

export default function SceneBlock({ scene, index, isActive, onDelete, onClick }: SceneBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`group relative flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
        isActive
          ? 'bg-violet-950/20 border-violet-500/30 shadow-md shadow-violet-500/10'
          : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-850/40'
      }`}
      onClick={() => onClick?.(index)}
    >
      {/* Drag handle */}
      <div className="mt-0.5 text-slate-500 group-hover:text-slate-400 transition-colors cursor-grab active:cursor-grabbing">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Scene number badge */}
      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-extrabold font-mono ${
        isActive
          ? 'bg-violet-500/20 text-violet-300'
          : 'bg-slate-800 text-slate-400'
      }`}>
        {index + 1}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-semibold text-slate-200 truncate">
            {scene.sceneDescription}
          </span>
          <span className="shrink-0 flex items-center gap-1 text-[9px] font-mono font-medium text-slate-300 bg-slate-850 px-1.5 py-0.5 rounded border border-slate-800">
            <Clock className="w-3 h-3 text-slate-400" />
            {scene.duration.toFixed(1)}s
          </span>
        </div>

        {/* Visual prompt */}
        <p className="text-[10px] text-slate-300 leading-relaxed line-clamp-2 mb-2">
          <span className="text-slate-500 font-semibold">Prompt:</span> {scene.visualPrompt}
        </p>

        {/* Caption preview */}
        {scene.caption && (
          <div className="inline-flex items-center gap-1.5 bg-black/25 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-800 max-w-full">
            <Sparkles className="w-2.5 h-2.5 text-violet-400 shrink-0" />
            <span className="text-[9px] text-slate-300 font-medium truncate">
              {scene.caption}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button className="p-1.5 rounded-lg text-slate-500 hover:text-violet-400 hover:bg-slate-850 transition-all opacity-0 group-hover:opacity-100 cursor-pointer">
          <Image className="w-3.5 h-3.5" />
        </button>
        <button className="p-1.5 rounded-lg text-slate-500 hover:text-fuchsia-400 hover:bg-slate-850 transition-all opacity-0 group-hover:opacity-100 cursor-pointer">
          <Play className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(index);
          }}
          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-850 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
