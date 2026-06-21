import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const FIELD_KEY_MAPPINGS: Record<string, { newKey: string; newLabel: string; categoryFilter?: string }> = {};

function addMapping(oldKeys: string[], newKey: string, newLabel: string, cat?: string) {
  for (const k of oldKeys) {
    FIELD_KEY_MAPPINGS[`${cat || ""}|${k}`] = { newKey, newLabel, categoryFilter: cat };
  }
}

// 도어락 매핑
addMapping([
  "잠금 해제 방식", "lock_type", "Locking Type", "lockingType", "locking_type",
  "Unlock Methods", "unlock_methods", "인증방식", "authentication_method",
  "출입방식", "개폐방식", "잠금 방식", "解锁方式", "access_methods", "5-in-1 Access",
  "Access Credential - Fingerprints", "Access Credential - PIN Code",
  "Access Credential - RFID Card", "Access Credential - Mechanical Key Override",
  "Access Credential - Bluetooth", "Access Credential - WiFi Connection",
  "Access Credential - WiFI Connection", "Access Credential - Remote Control",
  "Access Credential - Wi-Fi Connection",
  "access_credential_fingerprints", "access_credential_pin_code",
  "access_credential_rfid_card", "access_credential_mechanical_key_override",
  "access_credential_bluetooth", "access_credential_wifi_connection",
  "access_credential_remote_control",
  "fingerprintsCredential", "pinCodeCredential", "rfidCardCredential",
  "mechanicalKeyOverrideCredential", "bluetoothCredential", "wifiConnection",
  "remoteControlCredential",
  "Fingerprints", "PIN Code", "RFID Card", "Mechanical Key Override",
  "Bluetooth", "WiFi Connection", "Remote Control",
  "Fingerprint", "PIN", "RFID card", "NFC card", "mechanical key",
  "Mechanical key", "PIN code", "Fake PIN code",
  "3D face recognition", "Apple Home Key",
  "Fingerprint access", "RFID card/key tag access",
  "Unlock Method", "fingerprint", "password",
  "all_in_one_unlocking_options", "facial_recognition", "face_recognition",
  "Face Recognition", "Palm Vein", "Dual Verification",
], "unlock_method", "잠금해제 방식");

addMapping([
  "protocol", "compatible_platforms", "Connectivity",
  "네트워크", "무선연결", "无线连接",
  "matter_over_thread_for_multi_ecosystem_compatibility",
  "Apple HomeKit + Google Home", "WiFi", "WIFI联网", "APP连接",
], "connectivity", "연결 방식");

addMapping([
  "联动智能家居", "Yale Home app", "Aqara Home app",
  "app_features", "App Features", "APP功能", "wifi_app_capabilities",
], "smart_home_platform", "스마트홈 플랫폼");

addMapping(["재질", "Body Material", "主体材质", "主材材质", "Panel", "finish", "All-black finish"], "material", "소재");
addMapping(["Color", "색상"], "color", "색상");
addMapping([
  "크기", "外观尺寸", "Size (Front)", "Size (Back)",
  "Product Dimension - Size (Front)", "Product Dimension - Size (Back)",
  "product_dimension_size_front", "product_dimension_size_back",
  "sizeFront", "sizeBack", "제품크기외부", "제품크기내부", "Slim design", "size",
], "dimensions", "크기");

addMapping([
  "battery", "Battery", "电池", "battery_type", "battery_capacity",
  "Battery Capacity", "5,000mAh rechargeable battery",
  "convenient_rechargeable_power_system", "배터리",
], "battery_type", "배터리 종류");

addMapping(["battery_service_life", "estimated_battery_life", "续航时间"], "battery_life", "배터리 수명");
addMapping(["전원", "사용전원", "工作电源", "power_source", "wireless_charging", "充电口"], "power", "전원");
addMapping([
  "비상전원", "Emergency Power", "应急供电", "应急锁芯", "emergency_backup_port",
  "Additional Features - Low Battery and Emergency Power",
  "additional_features_low_battery_and_emergency_power",
  "lowBatteryAndEmergencyPower", "Low Battery and Emergency Power",
], "emergency_power", "비상 전원");

addMapping([
  "Door Thickness", "doorThickness", "适用门厚度", "door_thickness",
  "door_thickness_range", "Compatible with doors",
], "door_thickness", "도어 두께");

addMapping(["Backset", "关合轴距"], "backset", "백셋");
addMapping(["방수등급", "Weather Rating", "ip65_weatherproof_outer_panel", "IP52 rated"], "ip_rating", "방수방진 등급");
addMapping(["사용온도", "工作温度", "Operating Temperature"], "operating_temp", "사용 온도");

addMapping([
  "Automatic Locking", "Additional Features - Automatic Locking",
  "additional_features_automatic_locking", "automaticLocking",
  "Auto-lock", "auto_lock_on_close", "Auto-lock + anti-panic egress",
], "auto_lock", "자동잠금");

addMapping([
  "Additional Features - Remote Control (Optional)",
  "additional_features_remote_control_optional",
  "remoteControlOptional", "Remote Control (Optional)", "远程升级",
], "remote_control", "원격 제어");

addMapping([
  "security", "보안", "锁芯等级", "Security Cylinder",
  "bhma_certified", "certified_security_outdoor_durability",
  "Encryption", "security_features", "Security Features",
  "防盗模式", "anti-snoop PIN", "Class C lock cylinder", "보안 기능",
], "security_grade", "보안 등급");

addMapping([
  "설치방식", "installation", "适用门类型",
  "door_material_compatibility", "rekeyable_design",
  "mortise_type", "Locking Mechanism", "locking_mechanism_details",
  "Mortise Type", "锁体类型", "Locking Bolts", "不锈钢锁舌", "不锈钢三锁舌",
  "上提执手", "关门斜舌", "把手类型", "Fully automatic mortise",
], "installation_type", "설치 방식");

addMapping(["Salt Spray Test", "Salt Spray Tested", "Mortise Warranty", "Force Resistance", "인증_번호"], "certification", "인증");

addMapping([
  "Maximum No. of Users - Fingerprints", "maximum_no_of_users_fingerprints",
  "fingerprintsMaxUsers", "Face Storage", "Finger Vein Storage", "Palm Vein Storage",
  "Fingerprints / PIN / RFID", "PIN / RFID Storage",
  "指纹容量", "卡片容量", "用户容量", "face_id_user_capacity",
  "pin_code_capacity", "rfid_card_capacity", "fingerprint_sensor",
  "Maximum No. of Users - PIN Code", "Maximum No. of Users - RFID Card",
  "Maximum No. of Users - Mechanical Key Override", "Maximum No. of Users - One Time Code",
  "maximum_no_of_users_pin_code", "maximum_no_of_users_rfid_card",
  "maximum_no_of_users_mechanical_key_override", "maximum_no_of_users_one_time_code",
  "pinCodeMaxUsers", "rfidCardMaxUsers", "mechanicalKeyOverrideMaxUsers", "oneTimeCodeMaxUsers",
], "fingerprint_capacity", "지문 등록 수");

addMapping([
  "Recognition Speed", "指纹对比时间", "fingerprint_match_speed",
  "0.5s Fingerprint Recognition", "fingerprint_rejection_rate",
], "fingerprint_speed", "지문 인식 속도");

addMapping([
  "Camera View Angle", "camera", "2MP wide-angle camera",
  "Digital Viewer", "digital_door_viewer",
  "Real-Time Video & Intercom", "Two-Way Audio", "Two-way video intercom",
  "4-inch IPS indoor display", "indoor_screen", "Display", "抓拍存储",
], "camera", "카메라");

addMapping([
  "PIR motion sensor", "PIR Motion Detection", "Indoor Sensor", "猫眼功能",
], "motion_detection", "동작 감지");

addMapping([
  "alerts", "Smart Safety Alerts", "Smart Alerts",
  "Additional Features - Alarm (Break/ Damage)",
  "additional_features_alarm_break_damage", "alarmBreakDamage",
  "Alarm (Break/ Damage)", "报警功能", "picklock detection alarm",
], "alarm", "알림/경보");

addMapping([
  "부가기능", "부가기능(앱)", "features", "기능",
  "Additional Features - Voice Guide", "Additional Features - Anti-Panic Egress",
  "Additional Features - Fake PIN Code",
  "Additional Features - Bluetooth Module (Optional)",
  "Additional Features - App Link Apps (Optional)",
  "additional_features_voice_guide", "additional_features_anti_panic_egress",
  "additional_features_fake_pin_code",
  "additional_features_bluetooth_module_optional",
  "additional_features_app_link_apps_optional",
  "voiceGuide", "antiPanicEgress", "fakePinCode",
  "bluetoothModuleOptional", "appLinkAppsOptional",
  "Voice Guide", "Anti-Panic Egress",
  "Bluetooth Module (Optional)", "App Link Apps (Optional)",
  "night_latch_mode", "do_not_disturb_mode", "Mute mode",
  "synchronised_unlocking", "dual_verification_mode",
  "unlock_more_features_with_the_aqara_app",
  "语音功能", "存储方式", "存储容量", "etc", "기본구성", "기본 구성",
], "additional_features", "부가기능");

addMapping(["도어락형태", "lock_type_description"], "lock_form", "도어락 형태");

addMapping([
  "Model", "model", "제품명", "모델명", "产品型号", "锁体型号",
  "제품", "product_name", "제조사",
], "model_info", "모델 정보");

// 카메라 전용 매핑
addMapping(["ai_features"], "ai_detection", "AI 감지", "카메라");
addMapping(["야간_가시_거리"], "night_vision", "야간촬영", "카메라");
addMapping(["camera_resolution"], "resolution", "해상도", "카메라");
addMapping(["저장_방식"], "storage", "저장 방식", "카메라");
addMapping(["compatible_platforms"], "smart_home_platform", "스마트홈 플랫폼", "카메라");
addMapping(["protocol", "network", "네트워크"], "connectivity", "연결 방식", "카메라");

// 중국어 도어락 키
addMapping([
  "产品型号", "锁体型号", "外观尺寸", "主材材质", "天地钩", "指纹对比时间",
  "不锈钢三锁舌", "上提执手", "应急锁芯", "关门斜舌", "WIFI联网",
  "左右内外开通用", "卡片容量", "指纹容量", "触摸键盘", "密码组数",
  "卡片兼容类型", "物联网模块接口", "工作电源", "工作温度", "应急供电",
  "指纹传感器", "适用门厚度", "适用门类型", "相对湿度(RH)",
  "主体材质", "锁体类型", "关合轴距", "锁芯等级", "不锈钢锁舌",
  "把手类型", "解锁方式", "防盗模式", "猫眼功能", "报警功能",
  "电池", "适用人群", "适用场所", "存储方式",
  "无线连接", "存储容量", "静态电流", "动态电流", "充电口",
  "续航时间", "抓拍存储", "语音功能", "用户容量",
  "联动智能家居", "APP连接", "APP功能", "远程升级",
], "additional_features", "부가기능");

const SPEC_FIELDS_BY_CATEGORY: Record<string, { key: string; label: string; visible?: boolean }[]> = {
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
    { key: "ip_rating", label: "방수방진 등급" },
    { key: "security_grade", label: "보안 등급" },
    { key: "operating_temp", label: "사용 온도" },
    { key: "certification", label: "인증" },
    { key: "warranty", label: "보증" },
    { key: "fingerprint_capacity", label: "지문 등록 수" },
    { key: "fingerprint_speed", label: "지문 인식 속도" },
    { key: "camera", label: "카메라" },
    { key: "motion_detection", label: "동작 감지" },
    { key: "alarm", label: "알림/경보" },
    { key: "additional_features", label: "부가기능" },
    { key: "lock_form", label: "도어락 형태" },
    { key: "model_info", label: "모델 정보", visible: false },
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

export async function POST() {
  const results: string[] = [];
  let totalUpdated = 0;

  // 1. Get all specs with their product category
  const { data: allSpecs, error: fetchErr } = await supabase
    .from("specs")
    .select("id, field_key, field_label, value, product_id, products!inner(category)");

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  // 2. Build update batches
  const updates: { id: string; field_key: string; field_label: string; value: string }[] = [];

  for (const spec of allSpecs || []) {
    const cat = (spec.products as unknown as { category: string })?.category || "";
    const oldKey = spec.field_key;

    // Try category-specific mapping first, then general
    const catMapping = FIELD_KEY_MAPPINGS[`${cat}|${oldKey}`];
    const generalMapping = FIELD_KEY_MAPPINGS[`|${oldKey}`];
    const mapping = catMapping || generalMapping;

    if (mapping && mapping.newKey !== oldKey) {
      let value = spec.value;
      if (value && value.includes(",")) {
        value = value.split(",").map((v: string) => v.trim()).filter(Boolean).sort().join(", ");
      }
      updates.push({
        id: spec.id,
        field_key: mapping.newKey,
        field_label: mapping.newLabel,
        value,
      });
    } else if (spec.value && spec.value.includes(",")) {
      // Sort comma-separated values even if key doesn't change
      const sorted = spec.value.split(",").map((v: string) => v.trim()).filter(Boolean).sort().join(", ");
      if (sorted !== spec.value) {
        updates.push({
          id: spec.id,
          field_key: spec.field_key,
          field_label: spec.field_label,
          value: sorted,
        });
      }
    }
  }

  results.push(`Specs to update: ${updates.length} / ${allSpecs?.length || 0}`);

  // 3. Apply updates in batches
  const BATCH = 50;
  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH);
    for (const u of batch) {
      const { error } = await supabase
        .from("specs")
        .update({ field_key: u.field_key, field_label: u.field_label, value: u.value })
        .eq("id", u.id);
      if (!error) totalUpdated++;
    }
  }

  results.push(`Specs updated: ${totalUpdated}`);

  // 4. Remove duplicate specs (same product_id + field_key, keep first)
  const { data: dupes } = await supabase.rpc("find_duplicate_specs").catch(() => ({ data: null }));
  if (dupes) {
    results.push(`Duplicate specs found via RPC: ${dupes.length}`);
  }

  // Manual dedup: group by product_id+field_key, delete extras
  const { data: allUpdated } = await supabase
    .from("specs")
    .select("id, product_id, field_key")
    .order("id", { ascending: true });

  const seen = new Set<string>();
  const toDelete: string[] = [];
  for (const s of allUpdated || []) {
    const key = `${s.product_id}|${s.field_key}`;
    if (seen.has(key)) {
      toDelete.push(s.id);
    } else {
      seen.add(key);
    }
  }

  if (toDelete.length > 0) {
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100);
      await supabase.from("specs").delete().in("id", batch);
    }
    results.push(`Duplicate specs deleted: ${toDelete.length}`);
  }

  // 5. Update spec_fields for all categories
  for (const [cat, fields] of Object.entries(SPEC_FIELDS_BY_CATEGORY)) {
    await supabase.from("spec_fields").delete().eq("category", cat);
    const rows = fields.map((f, i) => ({
      category: cat,
      field_key: f.key,
      field_label: f.label,
      sort_order: i,
      is_visible: f.visible !== false,
    }));
    const { error } = await supabase.from("spec_fields").insert(rows);
    if (error) {
      results.push(`spec_fields ${cat} error: ${error.message}`);
    } else {
      results.push(`spec_fields ${cat}: ${fields.length} fields set`);
    }
  }

  return NextResponse.json({ ok: true, results, totalUpdated, duplicatesRemoved: toDelete.length });
}
