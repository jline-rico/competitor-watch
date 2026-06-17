"use client";

import { useEffect, useState } from "react";
import { getDeletePin, setDeletePin } from "@/lib/queries";

export function PinSettings() {
  const [hasPin, setHasPin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [savedPin, setSavedPin] = useState<string | null>(null);

  useEffect(() => {
    getDeletePin().then((pin) => {
      setHasPin(!!pin);
      setSavedPin(pin);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    if (hasPin && currentPin !== savedPin) {
      setError("현재 PIN이 일치하지 않습니다");
      return;
    }
    if (newPin.length !== 4) {
      setError("4자리 숫자를 입력하세요");
      return;
    }
    if (newPin !== confirmPin) {
      setError("새 PIN이 일치하지 않습니다");
      return;
    }
    await setDeletePin(newPin);
    setSavedPin(newPin);
    setHasPin(true);
    setEditing(false);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError("");
  };

  const handleCancel = () => {
    setEditing(false);
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setError("");
  };

  if (loading) {
    return (
      <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
        로딩 중...
      </p>
    );
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {hasPin ? "PIN이 설정되어 있습니다" : "PIN이 설정되지 않았습니다"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            경쟁사 삭제 시 PIN 입력이 필요합니다
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            background: "var(--bg)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
          }}
        >
          {hasPin ? "PIN 변경" : "PIN 설정"}
        </button>
      </div>
    );
  }

  const inputStyle = {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    outline: "none",
  };

  return (
    <div className="flex flex-col gap-3">
      {hasPin && (
        <div>
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            현재 PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={currentPin}
            onChange={(e) => { setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-mono"
            style={inputStyle}
            placeholder="····"
          />
        </div>
      )}
      <div>
        <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          새 PIN
        </label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={newPin}
          onChange={(e) => { setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
          className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-mono"
          style={inputStyle}
          placeholder="4자리 숫자"
        />
      </div>
      <div>
        <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          새 PIN 확인
        </label>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={confirmPin}
          onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }}
          className="mt-1 w-full rounded-lg px-3 py-2 text-sm font-mono"
          style={inputStyle}
          placeholder="4자리 숫자"
        />
      </div>

      {error && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          className="rounded-lg px-3 py-1.5 text-xs font-medium"
          style={{ color: "var(--text-tertiary)" }}
        >
          취소
        </button>
        <button
          onClick={handleSave}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          저장
        </button>
      </div>
    </div>
  );
}
