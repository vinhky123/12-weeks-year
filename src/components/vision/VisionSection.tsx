"use client";

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
    <div className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-sm text-white shadow">
          {step}
        </div>
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {subtitle}
            </span>
          </div>
          <p className="mt-1 text-sm italic text-slate-600">{prompt}</p>

          <div className="mt-4">
            {readOnly ? (
              <div className="min-h-[100px] whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-800">
                {value || <span className="italic text-slate-400">No vision entered.</span>}
              </div>
            ) : (
              <textarea
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                placeholder={placeholder}
                rows={4}
                className="w-full rounded-lg border border-slate-300 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-800"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
