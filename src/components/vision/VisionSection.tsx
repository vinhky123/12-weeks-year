"use client";

import React from "react";

interface VisionSectionProps {
  step: number;
  title: string;
  subtitle: string;
  prompt: string;
  value: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function VisionSection({
  step,
  title,
  subtitle,
  prompt,
  value,
  onChange,
  placeholder,
  readOnly = false,
}: VisionSectionProps) {
  return (
    <div className="relative rounded-xl border border-zinc-200 bg-white p-6 shadow-xs transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700">
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 font-bold text-sm text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-900">
          {step}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              {subtitle}
            </span>
          </div>
          <p className="mt-1 text-sm italic text-zinc-600 dark:text-zinc-400">{prompt}</p>

          <div className="mt-4">
            {readOnly ? (
              <div className="min-h-[100px] whitespace-pre-wrap rounded-lg bg-zinc-50 p-4 text-sm text-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-200">
                {value || <span className="italic text-zinc-400 dark:text-zinc-500">No vision entered.</span>}
              </div>
            ) : (
              <textarea
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                placeholder={placeholder}
                rows={4}
                className="w-full rounded-lg border border-zinc-300 p-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-800 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
