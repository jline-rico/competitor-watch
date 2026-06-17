import { CompetitorList } from "@/components/competitor-list";
import { FieldManager } from "@/components/field-manager";
import { PinSettings } from "@/components/pin-settings";
import { ScheduleConfig } from "@/components/schedule-config";

export default function SettingsPage() {
  return (
    <>
      <div className="animate-fade-in">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          설정
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-tertiary)" }}>
          경쟁사, 모니터링 주기, 비교 항목을 관리하세요
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        <section
          className="animate-fade-in stagger-1"
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            className="px-5 py-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              등록된 경쟁사
            </h2>
          </div>
          <div className="p-5">
            <CompetitorList />
          </div>
        </section>

        <section
          className="animate-fade-in stagger-2"
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            className="px-5 py-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              삭제 보호 PIN
            </h2>
          </div>
          <div className="p-5">
            <PinSettings />
          </div>
        </section>

        <section
          className="animate-fade-in stagger-3"
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            className="px-5 py-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              모니터링 주기
            </h2>
          </div>
          <div className="p-5">
            <ScheduleConfig />
          </div>
        </section>

        <section
          className="animate-fade-in stagger-4"
          style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            className="px-5 py-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              제품군별 비교 항목 관리
            </h2>
          </div>
          <div className="p-5">
            <FieldManager />
          </div>
        </section>
      </div>
    </>
  );
}
