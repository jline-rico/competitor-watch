"use client";

import { useEffect, useState } from "react";
import { getCompetitors, updateCompetitor, deleteCompetitor } from "@/lib/queries";
import type { Competitor } from "@/lib/types";

export function CompetitorList() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);

  useEffect(() => {
    getCompetitors().then(setCompetitors);
  }, []);

  const handleToggle = async (id: string, current: boolean) => {
    await updateCompetitor(id, { is_active: !current });
    setCompetitors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !current } : c))
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 경쟁사와 관련 제품/스펙이 모두 삭제됩니다. 계속하시겠습니까?")) return;
    await deleteCompetitor(id);
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
  };

  if (competitors.length === 0) {
    return <p className="text-sm text-gray-400">등록된 경쟁사가 없습니다.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {competitors.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between rounded-lg border bg-white px-4 py-3"
        >
          <div>
            <p className="font-medium">{c.name}</p>
            <p className="text-xs text-gray-400 truncate max-w-md">{c.catalog_url}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleToggle(c.id, c.is_active)}
              className={`rounded px-2 py-1 text-xs font-medium ${
                c.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {c.is_active ? "활성" : "비활성"}
            </button>
            <button
              onClick={() => handleDelete(c.id)}
              className="text-xs text-red-400 hover:text-red-600"
            >
              삭제
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
