"use client";

interface WamFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  rows?: number;
}

export function WamField({
  label,
  placeholder,
  value,
  onChange,
  rows = 3,
}: WamFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-800 focus:outline-none"
      />
    </div>
  );
}
