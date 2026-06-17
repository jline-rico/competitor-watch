"use client";

import { useEffect, useRef, useState } from "react";

interface PinModalProps {
  mode: "verify" | "setup";
  onVerified: () => void;
  onCancel: () => void;
  verifyPin: (pin: string) => boolean;
  onSetPin?: (pin: string) => void;
}

export function PinModal({ mode, onVerified, onCancel, verifyPin, onSetPin }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">(mode === "setup" ? "enter" : "enter");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step]);

  const handleSubmit = () => {
    if (mode === "verify") {
      if (verifyPin(pin)) {
        onVerified();
      } else {
        setError("PIN이 일치하지 않습니다");
        setPin("");
        inputRef.current?.focus();
      }
      return;
    }

    if (step === "enter") {
      if (pin.length !== 4) {
        setError("4자리 숫자를 입력하세요");
        return;
      }
      setStep("confirm");
      setConfirmPin("");
      setError("");
      return;
    }

    if (confirmPin !== pin) {
      setError("PIN이 일치하지 않습니다. 다시 입력하세요.");
      setConfirmPin("");
      setStep("enter");
      setPin("");
      return;
    }

    onSetPin?.(pin);
    onVerified();
  };

  const currentValue = step === "confirm" ? confirmPin : pin;
  const setCurrentValue = step === "confirm" ? setConfirmPin : setPin;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onCancel}
    >
      <div
        className="w-80 rounded-xl p-6"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="text-base font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {mode === "setup"
            ? step === "confirm"
              ? "PIN 확인"
              : "삭제 보호 PIN 설정"
            : "삭제 보호 PIN 입력"}
        </h3>
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--text-tertiary)" }}
        >
          {mode === "setup"
            ? step === "confirm"
              ? "동일한 PIN을 다시 입력하세요"
              : "4자리 숫자 PIN을 설정하세요"
            : "경쟁사 삭제를 위해 PIN을 입력하세요"}
        </p>

        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={currentValue}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
            setCurrentValue(v);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
          className="mt-4 w-full rounded-lg px-3 py-2.5 text-center text-lg tracking-[0.5em] font-mono"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            outline: "none",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          placeholder="····"
        />

        {error && (
          <p className="mt-2 text-xs" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={{
              background: "var(--bg)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={currentValue.length !== 4}
            className="flex-1 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors"
            style={{
              background: currentValue.length === 4 ? "var(--accent)" : "var(--border)",
              cursor: currentValue.length === 4 ? "pointer" : "not-allowed",
            }}
          >
            {mode === "setup" && step === "enter" ? "다음" : "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}
