"use client";

import { useEffect, useState } from "react";
import type {
  ModelWeekDto,
  BlockTemplateDto,
  BlockCreate,
  BlockUpdate,
} from "@/lib/contracts";
import { apiFetch, ClientApiError } from "@/components/common/api";
import { WarningsPanel } from "@/components/model-week/WarningsPanel";
import { ModelWeekGrid } from "@/components/model-week/ModelWeekGrid";
import { BlockModal } from "@/components/model-week/BlockModal";

const BOOK_DEFAULTS: BlockCreate[] = [
  {
    type: "PLANNING",
    dayOfWeek: 0,
    startMinute: 510,
    durationMinutes: 20,
    label: "Score last week · plan this week",
  },
  {
    type: "STRATEGIC",
    dayOfWeek: 2,
    startMinute: 540,
    durationMinutes: 180,
    label: "Deep work — 12-Week Plan tactics",
  },
  {
    type: "BUFFER",
    dayOfWeek: 0,
    startMinute: 660,
    durationMinutes: 45,
    label: "Email · admin · noise",
  },
  {
    type: "BUFFER",
    dayOfWeek: 1,
    startMinute: 660,
    durationMinutes: 45,
    label: "Email · admin · noise",
  },
  {
    type: "BUFFER",
    dayOfWeek: 2,
    startMinute: 660,
    durationMinutes: 45,
    label: "Email · admin · noise",
  },
  {
    type: "BUFFER",
    dayOfWeek: 3,
    startMinute: 660,
    durationMinutes: 45,
    label: "Email · admin · noise",
  },
  {
    type: "BUFFER",
    dayOfWeek: 4,
    startMinute: 660,
    durationMinutes: 45,
    label: "Email · admin · noise",
  },
  {
    type: "WAM",
    dayOfWeek: 0,
    startMinute: 1050,
    durationMinutes: 30,
    label: "Weekly Accountability Meeting",
  },
  {
    type: "BREAKOUT",
    dayOfWeek: 5,
    startMinute: 480,
    durationMinutes: 240,
    label: "Off — fully away from work",
  },
];

export default function ModelWeekPage() {
  const [data, setData] = useState<ModelWeekDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<BlockTemplateDto | null>(null);
  const [defaultDay, setDefaultDay] = useState(0);

  const [applyingDefaults, setApplyingDefaults] = useState(false);

  const fetchModelWeek = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch<ModelWeekDto>("/api/model-week");
      setData(res);
    } catch (err) {
      if (err instanceof ClientApiError) {
        setError(err.message);
      } else {
        setError("Failed to load model week.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelWeek();
  }, []);

  const handleOpenAdd = (dayOfWeek: number = 0) => {
    setEditingBlock(null);
    setDefaultDay(dayOfWeek);
    setModalOpen(true);
  };

  const handleOpenEdit = (block: BlockTemplateDto) => {
    setEditingBlock(block);
    setDefaultDay(block.dayOfWeek);
    setModalOpen(true);
  };

  const handleModalSubmit = async (blockData: BlockCreate) => {
    if (editingBlock) {
      const res = await apiFetch<ModelWeekDto>(`/api/model-week/${editingBlock.id}`, {
        method: "PATCH",
        body: JSON.stringify(blockData as BlockUpdate),
      });
      setData(res);
    } else {
      const res = await apiFetch<ModelWeekDto>("/api/model-week", {
        method: "POST",
        body: JSON.stringify(blockData),
      });
      setData(res);
    }
  };

  const handleDeleteBlock = async (id: number) => {
    try {
      const res = await apiFetch<ModelWeekDto>(`/api/model-week/${id}`, {
        method: "DELETE",
      });
      setData(res);
    } catch (err) {
      if (err instanceof ClientApiError) {
        alert(err.message);
      } else {
        alert("Failed to delete block.");
      }
    }
  };

  const handleApplyDefaults = async () => {
    setApplyingDefaults(true);
    try {
      let latestState: ModelWeekDto | null = null;
      for (const block of BOOK_DEFAULTS) {
        latestState = await apiFetch<ModelWeekDto>("/api/model-week", {
          method: "POST",
          body: JSON.stringify(block),
        });
      }
      if (latestState) {
        setData(latestState);
      }
    } catch (err) {
      if (err instanceof ClientApiError) {
        alert(err.message);
      } else {
        alert("Failed to apply book defaults.");
      }
    } finally {
      setApplyingDefaults(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-baseline">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Tuần mẫu</h1>
            <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Kiểm soát thời gian của bạn, hoặc bạn sẽ đánh mất quyền kiểm soát kết quả.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenAdd(0)}
              className="inline-flex items-center rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 shadow-xs hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              + Thêm khung giờ
            </button>
          </div>
        </div>

        {/* Nudges & Warnings Panel */}
        {data && (
          <div className="mt-5">
            <WarningsPanel
              warnings={data.warnings}
              blockCount={data.blocks.length}
              onApplyDefaults={handleApplyDefaults}
              applyingDefaults={applyingDefaults}
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-96 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-6 text-center text-rose-800 dark:text-rose-200">
          <p className="font-semibold">Không thể tải tuần mẫu</p>
          <p className="mt-1 text-sm">{error}</p>
          <button
            type="button"
            onClick={fetchModelWeek}
            className="mt-4 rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 py-2 text-xs font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
          >
            Thử lại
          </button>
        </div>
      ) : data ? (
        <div className="space-y-6">
          <ModelWeekGrid
            blocks={data.blocks}
            onAddBlock={handleOpenAdd}
            onEditBlock={handleOpenEdit}
            onDeleteBlock={handleDeleteBlock}
            disabled={applyingDefaults}
          />

          {/* Micro-copy footer */}
          <div className="pt-4 text-center">
            <p className="text-xs italic text-zinc-400 dark:text-zinc-500">
              Bận rộn là một hình thức lười biếng — lười tư duy và hành động thiếu chọn lọc.
            </p>
          </div>
        </div>
      ) : null}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <BlockModal
          initialBlock={editingBlock}
          defaultDayOfWeek={defaultDay}
          onSubmit={handleModalSubmit}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
