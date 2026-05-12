import { CompetitorList } from "@/components/competitor-list";
import { FieldManager } from "@/components/field-manager";
import { ScheduleConfig } from "@/components/schedule-config";

export default function SettingsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">설정</h1>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">등록된 경쟁사</h2>
        <div className="mt-3">
          <CompetitorList />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">모니터링 주기</h2>
        <div className="mt-3">
          <ScheduleConfig />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">제품군별 비교 항목 관리</h2>
        <div className="mt-3">
          <FieldManager />
        </div>
      </section>
    </>
  );
}
