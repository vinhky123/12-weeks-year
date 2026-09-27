"use client";

import { useRef, useState } from "react";
import { BackupsList } from "./BackupsList";
import { ImportModal } from "./ImportModal";

export function DataSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
    payload: unknown;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [backupTrigger, setBackupTrigger] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClientError(null);
    setImportSummary(null);

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        setSelectedFile({
          name: file.name,
          size: file.size,
          payload: parsed,
        });
        setShowModal(true);
      } catch {
        setClientError("Not a valid backup file.");
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };

    reader.onerror = () => {
      setClientError("Not a valid backup file.");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    reader.readAsText(file);
  };

  const handleImportSuccess = (counts: Record<string, number>) => {
    setShowModal(false);
    setSelectedFile(null);
    setBackupTrigger((prev) => prev + 1);

    // Format top counts summary
    const entries = Object.entries(counts).filter(([, count]) => count > 0);
    const topThree = entries.slice(0, 3).map(([table, count]) => `${count} ${table}`);
    const summaryStr =
      topThree.length > 0
        ? `Imported: ${topThree.join(", ")}${entries.length > 3 ? "…" : ""}`
        : "Imported backup successfully.";
    setImportSummary(summaryStr);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
        Data Portability
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Your data is yours — one file, one folder, no cloud.
      </p>

      {/* Success alert with reload prompt */}
      {importSummary && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs dark:border-emerald-900/50 dark:bg-emerald-950/40">
          <p className="font-semibold text-emerald-800 dark:text-emerald-200">
            {importSummary}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-emerald-700 dark:text-emerald-300">
              Reload the app to display your restored workspace.
            </span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            >
              Reload App
            </button>
          </div>
        </div>
      )}

      {/* Client file validation error */}
      {clientError && (
        <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {clientError}
        </div>
      )}

      {/* Export & Import Action Buttons */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a
          href="/api/export"
          download
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download backup
        </a>

        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Import backup
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {/* Backups List */}
      <BackupsList refreshTrigger={backupTrigger} />

      {/* Double confirm modal */}
      {selectedFile && (
        <ImportModal
          isOpen={showModal}
          fileName={selectedFile.name}
          fileSizeBytes={selectedFile.size}
          payload={selectedFile.payload}
          onClose={() => {
            setShowModal(false);
            setSelectedFile(null);
          }}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}
