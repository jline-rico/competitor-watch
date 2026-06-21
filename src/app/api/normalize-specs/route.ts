import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const STANDARD_FIELDS: Record<string, { key: string; label: string }[]> = {
  도어락: [
    { key: "unlock_method", label: "잠금해제 방식" },
    { key: "connectivity", label: "연결 방식" },
    { key: "smart_home_platform", label: "스마트홈 플랫폼" },
    { key: "matter_support", label: "Matter 지원" },
    { key: "auto_lock", label: "자동잠금" },
    { key: "remote_control", label: "원격 제어" },
    { key: "material", label: "소재" },
    { key: "color", label: "색상" },
    { key: "dimensions", label: "크기" },
    { key: "weight", label: "무게" },
    { key: "power", label: "전원" },
    { key: "battery_type", label: "배터리 종류" },
    { key: "battery_life", label: "배터리 수명" },
    { key: "emergency_power", label: "비상 전원" },
    { key: "door_thickness", label: "도어 두께" },
    { key: "backset", label: "백셋" },
    { key: "installation_type", label: "설치 방식" },
    { key: "fire_rating", label: "내화 등급" },
    { key: "ip_rating", label: "방수방진 등급" },
    { key: "security_grade", label: "보안 등급" },
    { key: "operating_temp", label: "사용 온도" },
    { key: "certification", label: "인증" },
    { key: "warranty", label: "보증" },
  ],
  카메라: [
    { key: "resolution", label: "해상도" },
    { key: "fov", label: "화각" },
    { key: "night_vision", label: "야간촬영" },
    { key: "motion_detection", label: "동작 감지" },
    { key: "two_way_audio", label: "양방향 오디오" },
    { key: "storage", label: "저장 방식" },
    { key: "connectivity", label: "연결 방식" },
    { key: "smart_home_platform", label: "스마트홈 플랫폼" },
    { key: "matter_support", label: "Matter 지원" },
    { key: "power", label: "전원" },
    { key: "ip_rating", label: "방수방진 등급" },
    { key: "dimensions", label: "크기" },
    { key: "weight", label: "무게" },
    { key: "operating_temp", label: "사용 온도" },
    { key: "pan_tilt", label: "팬틸트" },
    { key: "ai_detection", label: "AI 감지" },
    { key: "siren", label: "사이렌" },
    { key: "color", label: "색상" },
  ],
  센서: [
    { key: "sensor_type", label: "센서 종류" },
    { key: "detection_range", label: "감지 범위" },
    { key: "connectivity", label: "연결 방식" },
    { key: "smart_home_platform", label: "스마트홈 플랫폼" },
    { key: "matter_support", label: "Matter 지원" },
    { key: "power", label: "전원" },
    { key: "battery_type", label: "배터리 종류" },
    { key: "battery_life", label: "배터리 수명" },
    { key: "dimensions", label: "크기" },
    { key: "weight", label: "무게" },
    { key: "ip_rating", label: "방수방진 등급" },
    { key: "operating_temp", label: "사용 온도" },
    { key: "color", label: "색상" },
  ],
  허브: [
    { key: "supported_protocols", label: "지원 프로토콜" },
    { key: "connectivity", label: "연결 방식" },
    { key: "smart_home_platform", label: "스마트홈 플랫폼" },
    { key: "matter_support", label: "Matter 지원" },
    { key: "max_devices", label: "최대 기기 수" },
    { key: "power", label: "전원" },
    { key: "dimensions", label: "크기" },
    { key: "weight", label: "무게" },
    { key: "color", label: "색상" },
  ],
  조명: [
    { key: "bulb_type", label: "전구 타입" },
    { key: "brightness", label: "밝기" },
    { key: "color_temp", label: "색온도" },
    { key: "color_support", label: "컬러 지원" },
    { key: "wattage", label: "소비전력" },
    { key: "connectivity", label: "연결 방식" },
    { key: "smart_home_platform", label: "스마트홈 플랫폼" },
    { key: "matter_support", label: "Matter 지원" },
    { key: "dimming", label: "디밍" },
    { key: "lifespan", label: "수명" },
    { key: "dimensions", label: "크기" },
    { key: "weight", label: "무게" },
    { key: "color", label: "색상" },
  ],
  스위치: [
    { key: "switch_type", label: "스위치 종류" },
    { key: "gang_count", label: "구수" },
    { key: "connectivity", label: "연결 방식" },
    { key: "smart_home_platform", label: "스마트홈 플랫폼" },
    { key: "matter_support", label: "Matter 지원" },
    { key: "max_load", label: "최대 부하" },
    { key: "power", label: "전원" },
    { key: "neutral_wire", label: "중성선 필요" },
    { key: "dimensions", label: "크기" },
    { key: "weight", label: "무게" },
    { key: "color", label: "색상" },
    { key: "material", label: "소재" },
  ],
};

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");

  if (!category) {
    return NextResponse.json(
      { categories: Object.keys(STANDARD_FIELDS) },
      { status: 200 }
    );
  }

  const supabase = getSupabase();
  const { data: specs, error } = await supabase
    .from("specs")
    .select("field_key, field_label, products!inner(category)")
    .eq("products.category", category);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const keyMap = new Map<string, number>();
  for (const s of specs || []) {
    const k = `${s.field_key}|${s.field_label}`;
    keyMap.set(k, (keyMap.get(k) || 0) + 1);
  }

  const existing = [...keyMap.entries()]
    .map(([k, count]) => {
      const [field_key, field_label] = k.split("|");
      return { field_key, field_label, count };
    })
    .sort((a, b) => b.count - a.count);

  const standard = STANDARD_FIELDS[category] || [];

  return NextResponse.json({
    category,
    total_specs: specs?.length || 0,
    unique_keys: existing.length,
    existing_keys: existing,
    standard_fields: standard,
  });
}
