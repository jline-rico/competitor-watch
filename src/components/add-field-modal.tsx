"use client";

import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (field_key: string, field_label: string) => void;
}

export function AddFieldModal({ open, onClose, onAdd }: Props) {
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    if (!key.trim() || !label.trim()) return;
    onAdd(key.trim(), label.trim());
    setKey("");
    setLabel("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="font-bold">비교 항목 추가</h3>
        <div className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            placeholder="항목 키 (영문, 예: battery_life)"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="표시 라벨 (예: 배터리 수명)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-2 text-sm hover:bg-gray-100">
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!key.trim() || !label.trim()}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
