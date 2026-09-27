import React from "react";

interface PrincipleLineProps {
  principle: string;
}

export default function PrincipleLine({ principle }: PrincipleLineProps) {
  if (!principle) return null;
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-100/70 px-4 py-3 text-sm italic text-zinc-700 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300">
      &ldquo;{principle}&rdquo;
    </div>
  );
}
