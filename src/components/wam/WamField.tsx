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
      <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none"
      />
    </div>
  );
}
