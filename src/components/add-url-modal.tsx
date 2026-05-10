"use client";

import { useState } from "react";
import { createCompetitor } from "@/lib/queries";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddUrlModal({ open, onClose }: Props) {
  const [mode, setMode] = useState<"competitor" | "product">("competitor");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!name.trim() || !url.trim()) return;
    setLoading(true);
    setStatus("처리 중...");

    try {
      if (mode === "competitor") {
        await createCompetitor(name.trim(), url.trim());
        const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL;
        if (webhookUrl) {
          await fetch(`${webhookUrl}/add-competitor`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim(), catalog_url: url.trim() }),
          }).catch(() => {});
        }
        setStatus("경쟁사가 등록되었습니다. 크롤링이 시작됩니다.");
      } else {
        const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE_URL;
        if (webhookUrl) {
          await fetch(`${webhookUrl}/add-product`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              competitor_name: name.trim(),
              product_url: url.trim(),
            }),
          }).catch(() => {});
        }
        setStatus("제품 조사가 시작되었습니다. 1-2분 후 새로고침하세요.");
      }
    } catch {
      setStatus("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName("");
    setUrl("");
    setStatus(null);
    setMode("competitor");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">URL 추가</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>

        <div className="mt-4 flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={mode === "competitor"}
              onChange={() => setMode("competitor")}
            />
            <span className="text-sm">경쟁사 등록 (주기적 모니터링)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={mode === "product"}
              onChange={() => setMode("product")}
            />
            <span className="text-sm">단일 제품 (1회성)</span>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            placeholder="업체명"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
          />
        </div>

        {status && (
          <p className="mt-3 text-sm text-blue-600">{status}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !name.trim() || !url.trim()}
          className="mt-4 w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "처리 중..." : "조사 시작"}
        </button>
      </div>
    </div>
  );
}
