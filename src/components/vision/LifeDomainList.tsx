"use client";

import { useState } from "react";
import type { LifeDomainDto } from "@/lib/contracts";

const SUGGESTED_DOMAINS = [
  "Health",
  "Family",
  "Career/Business",
  "Finances",
  "Social",
  "Personal",
  "Spiritual",
  "Community",
];

interface LifeDomainListProps {
  domains: LifeDomainDto[];
  onChange?: (domains: LifeDomainDto[]) => void;
  readOnly?: boolean;
}

export function LifeDomainList({ domains, onChange, readOnly = false }: LifeDomainListProps) {
  const [newArea, setNewArea] = useState("");
  const [newNote, setNewNote] = useState("");

  const handleAdd = (areaToAdd?: string) => {
    const area = (areaToAdd ?? newArea).trim();
    if (!area) return;

    const next = [...domains, { area, note: areaToAdd ? "" : newNote.trim() }];
    onChange?.(next);
    if (!areaToAdd) {
      setNewArea("");
      setNewNote("");
    }
  };

  const handleRemove = (index: number) => {
    const next = domains.filter((_, i) => i !== index);
    onChange?.(next);
  };

  const handleUpdate = (index: number, field: "area" | "note", val: string) => {
    const next = domains.map((d, i) => (i === index ? { ...d, [field]: val } : d));
    onChange?.(next);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-slate-900">Life Domains</h2>
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Whole-Life Perspective
        </span>
      </div>
      <p className="mt-1 text-sm italic text-slate-600">
        Vision across your whole life — business goals serve personal ends.
      </p>

      {!readOnly && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Suggested Domains
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTED_DOMAINS.map((dom) => {
              const alreadyAdded = domains.some((d) => d.area.toLowerCase() === dom.toLowerCase());
              return (
                <button
                  key={dom}
                  type="button"
                  onClick={() => handleAdd(dom)}
                  disabled={alreadyAdded}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    alreadyAdded
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  + {dom}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Domain rows */}
      <div className="mt-5 space-y-3">
        {domains.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-4 text-center text-xs italic text-slate-400">
            No life domains defined yet.
          </p>
        ) : (
          domains.map((dom, idx) => (
            <div
              key={`${dom.area}-${idx}`}
              className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex-1 space-y-2">
                {readOnly ? (
                  <div>
                    <span className="font-semibold text-sm text-slate-900">{dom.area}</span>
                    {dom.note && <p className="mt-1 text-xs text-slate-600">{dom.note}</p>}
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={dom.area}
                      onChange={(e) => handleUpdate(idx, "area", e.target.value)}
                      placeholder="Domain area (e.g. Health)"
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-sm font-medium text-slate-900 focus:border-slate-800 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={dom.note}
                      onChange={(e) => handleUpdate(idx, "note", e.target.value)}
                      placeholder="Note or aspirational standard"
                      className="w-full rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 focus:border-slate-800 focus:outline-none"
                    />
                  </>
                )}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Remove domain"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="h-4 w-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Manual add input */}
      {!readOnly && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
            placeholder="Custom domain (e.g. Creative Arts)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
          />
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Aspirational note"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-800 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => handleAdd()}
            disabled={!newArea.trim()}
            className="shrink-0 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-40"
          >
            Add Domain
          </button>
        </div>
      )}
    </div>
  );
}
