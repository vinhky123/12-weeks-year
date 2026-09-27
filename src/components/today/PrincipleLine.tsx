interface PrincipleLineProps {
  principle: string;
}

export default function PrincipleLine({ principle }: PrincipleLineProps) {
  if (!principle) return null;
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm italic text-slate-700 shadow-2xs">
      &ldquo;{principle}&rdquo;
    </div>
  );
}
