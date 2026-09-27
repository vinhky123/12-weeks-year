"use client";

import type { BlockTemplateDto } from "@/lib/contracts";
import {
  BLOCK_TYPE_CONFIG,
  formatTimeRange,
  formatDuration,
} from "./timeUtils";

interface BlockCardProps {
  block: BlockTemplateDto;
  onEdit: (block: BlockTemplateDto) => void;
  onDelete: (id: number) => void;
  disabled?: boolean;
}

export function BlockCard({ block, onEdit, onDelete, disabled = false }: BlockCardProps) {
  const config = BLOCK_TYPE_CONFIG[block.type] ?? BLOCK_TYPE_CONFIG.BUFFER;
  const timeRange = formatTimeRange(block.startMinute, block.durationMinutes);
  const durationStr = formatDuration(block.durationMinutes);

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-lg border p-3 shadow-xs transition hover:shadow-sm ${config.cardBg} ${config.border}`}
    >
      <div>
        <div className="flex items-start justify-between gap-1">
          <span
            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.badgeBg} ${config.badgeText}`}
          >
            {config.name}
          </span>
          <span className="text-[11px] font-semibold text-slate-500">{durationStr}</span>
        </div>

        <p className="mt-1.5 text-xs font-bold text-slate-900 leading-snug">
          {block.label || config.name}
        </p>

        <p className="mt-1 text-[11px] font-medium text-slate-600">{timeRange}</p>
      </div>

      <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-slate-200/60 pt-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onEdit(block)}
          disabled={disabled}
          className="rounded p-1 text-slate-500 hover:bg-white/80 hover:text-slate-800"
          title="Edit block"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onDelete(block.id)}
          disabled={disabled}
          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          title="Delete block"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
