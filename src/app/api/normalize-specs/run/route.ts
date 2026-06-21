import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// old_key -> [new_key, new_label]
const MAP: Record<string, [string, string]> = {
  // unlock_method
  "잠금 해제 방식": ["unlock_method", "잠금해제 방식"],
  "lock_type": ["unlock_method", "잠금해제 방식"],
  "Locking Type": ["unlock_method", "잠금해제 방식"],
  "lockingType": ["unlock_method", "잠금해제 방식"],
  "locking_type": ["unlock_method", "잠금해제 방식"],
  "Unlock Methods": ["unlock_method", "잠금해제 방식"],
  "unlock_methods": ["unlock_method", "잠금해제 방식"],
  "인증방식": ["unlock_method", "잠금해제 방식"],
  "authentication_method": ["unlock_method", "잠금해제 방식"],
  "출입방식": ["unlock_method", "잠금해제 방식"],
  "개폐방식": ["unlock_method", "잠금해제 방식"],
  "解锁方式": ["unlock_method", "잠금해제 방식"],
  "access_methods": ["unlock_method", "잠금해제 방식"],
  "Unlock Method": ["unlock_method", "잠금해제 방식"],
  "fingerprint": ["unlock_method", "잠금해제 방식"],
  "password": ["unlock_method", "잠금해제 방식"],
  "facial_recognition": ["unlock_method", "잠금해제 방식"],
  "face_recognition": ["unlock_method", "잠금해제 방식"],
  "Face Recognition": ["unlock_method", "잠금해제 방식"],
  "Fingerprint": ["unlock_method", "잠금해제 방식"],
  "PIN": ["unlock_method", "잠금해제 방식"],
  "RFID card": ["unlock_method", "잠금해제 방식"],
  "NFC card": ["unlock_method", "잠금해제 방식"],
  "mechanical key": ["unlock_method", "잠금해제 방식"],
  "Mechanical key": ["unlock_method", "잠금해제 방식"],
  "PIN code": ["unlock_method", "잠금해제 방식"],
  "Apple Home Key": ["unlock_method", "잠금해제 방식"],
  "Palm Vein": ["unlock_method", "잠금해제 방식"],
  "Dual Verification": ["unlock_method", "잠금해제 방식"],
  "3D face recognition": ["unlock_method", "잠금해제 방식"],
  "Fingerprint access": ["unlock_method", "잠금해제 방식"],
  "RFID card/key tag access": ["unlock_method", "잠금해제 방식"],
  // Access Credential variants
  "Access Credential - Fingerprints": ["unlock_method", "잠금해제 방식"],
  "Access Credential - PIN Code": ["unlock_method", "잠금해제 방식"],
  "Access Credential - RFID Card": ["unlock_method", "잠금해제 방식"],
  "Access Credential - Mechanical Key Override": ["unlock_method", "잠금해제 방식"],
  "Access Credential - Bluetooth": ["unlock_method", "잠금해제 방식"],
  "Access Credential - WiFi Connection": ["unlock_method", "잠금해제 방식"],
  "Access Credential - WiFI Connection": ["unlock_method", "잠금해제 방식"],
  "Access Credential - Remote Control": ["unlock_method", "잠금해제 방식"],
  "Access Credential - Wi-Fi Connection": ["unlock_method", "잠금해제 방식"],
  "Fingerprints": ["unlock_method", "잠금해제 방식"],
  "PIN Code": ["unlock_method", "잠금해제 방식"],
  "RFID Card": ["unlock_method", "잠금해제 방식"],
  "Mechanical Key Override": ["unlock_method", "잠금해제 방식"],
  "Bluetooth": ["unlock_method", "잠금해제 방식"],
  "WiFi Connection": ["unlock_method", "잠금해제 방식"],
  "Remote Control": ["unlock_method", "잠금해제 방식"],
  "Fake PIN code": ["unlock_method", "잠금해제 방식"],
  // snake_case Access Credential variants
  "access_credential_fingerprints": ["unlock_method", "잠금해제 방식"],
  "access_credential_pin_code": ["unlock_method", "잠금해제 방식"],
  "access_credential_rfid_card": ["unlock_method", "잠금해제 방식"],
  "access_credential_mechanical_key_override": ["unlock_method", "잠금해제 방식"],
  "access_credential_bluetooth": ["unlock_method", "잠금해제 방식"],
  "access_credential_wifi_connection": ["unlock_method", "잠금해제 방식"],
  "access_credential_remote_control": ["unlock_method", "잠금해제 방식"],
  // camelCase variants
  "fingerprintsCredential": ["unlock_method", "잠금해제 방식"],
  "pinCodeCredential": ["unlock_method", "잠금해제 방식"],
  "rfidCardCredential": ["unlock_method", "잠금해제 방식"],
  "mechanicalKeyOverrideCredential": ["unlock_method", "잠금해제 방식"],
  "bluetoothCredential": ["unlock_method", "잠금해제 방식"],
  "wifiConnection": ["unlock_method", "잠금해제 방식"],
  "remoteControlCredential": ["unlock_method", "잠금해제 방식"],
  "all_in_one_unlocking_options": ["unlock_method", "잠금해제 방식"],
  "5-in-1 Access": ["unlock_method", "잠금해제 방식"],

  // connectivity
  "protocol": ["connectivity", "연결 방식"],
  "compatible_platforms": ["connectivity", "연결 방식"],
  "Connectivity": ["connectivity", "연결 방식"],
  "네트워크": ["connectivity", "연결 방식"],
  "无线连接": ["connectivity", "연결 방식"],
  "WIFI联网": ["connectivity", "연결 방식"],
  "APP连接": ["connectivity", "연결 방식"],
  "WiFi": ["connectivity", "연결 방식"],
  "network": ["connectivity", "연결 방식"],
  "matter_over_thread_for_multi_ecosystem_compatibility": ["connectivity", "연결 방식"],

  // smart_home_platform
  "联动智能家居": ["smart_home_platform", "스마트홈 플랫폼"],
  "Yale Home app": ["smart_home_platform", "스마트홈 플랫폼"],
  "Aqara Home app": ["smart_home_platform", "스마트홈 플랫폼"],
  "app_features": ["smart_home_platform", "스마트홈 플랫폼"],
  "App Features": ["smart_home_platform", "스마트홈 플랫폼"],
  "APP功能": ["smart_home_platform", "스마트홈 플랫폼"],
  "wifi_app_capabilities": ["smart_home_platform", "스마트홈 플랫폼"],
  "Apple HomeKit + Google Home": ["smart_home_platform", "스마트홈 플랫폼"],

  // material
  "재질": ["material", "소재"],
  "Body Material": ["material", "소재"],
  "主体材质": ["material", "소재"],
  "主材材质": ["material", "소재"],
  "Panel": ["material", "소재"],
  "finish": ["material", "소재"],
  "All-black finish": ["material", "소재"],

  // color
  "Color": ["color", "색상"],
  "색상": ["color", "색상"],

  // dimensions
  "크기": ["dimensions", "크기"],
  "外观尺寸": ["dimensions", "크기"],
  "Size (Front)": ["dimensions", "크기"],
  "Size (Back)": ["dimensions", "크기"],
  "Product Dimension - Size (Front)": ["dimensions", "크기"],
  "Product Dimension - Size (Back)": ["dimensions", "크기"],
  "product_dimension_size_front": ["dimensions", "크기"],
  "product_dimension_size_back": ["dimensions", "크기"],
  "sizeFront": ["dimensions", "크기"],
  "sizeBack": ["dimensions", "크기"],
  "제품크기외부": ["dimensions", "크기"],
  "제품크기내부": ["dimensions", "크기"],
  "size": ["dimensions", "크기"],

  // battery
  "battery": ["battery_type", "배터리 종류"],
  "Battery": ["battery_type", "배터리 종류"],
  "电池": ["battery_type", "배터리 종류"],
  "battery_type": ["battery_type", "배터리 종류"],
  "battery_capacity": ["battery_type", "배터리 종류"],
  "Battery Capacity": ["battery_type", "배터리 종류"],
  "배터리": ["battery_type", "배터리 종류"],
  "battery_service_life": ["battery_life", "배터리 수명"],
  "estimated_battery_life": ["battery_life", "배터리 수명"],
  "续航时间": ["battery_life", "배터리 수명"],

  // power
  "전원": ["power", "전원"],
  "사용전원": ["power", "전원"],
  "工作电源": ["power", "전원"],
  "power_source": ["power", "전원"],
  "wireless_charging": ["power", "전원"],
  "충전口": ["power", "전원"],

  // emergency_power
  "비상전원": ["emergency_power", "비상 전원"],
  "Emergency Power": ["emergency_power", "비상 전원"],
  "应急供电": ["emergency_power", "비상 전원"],
  "应急锁芯": ["emergency_power", "비상 전원"],
  "emergency_backup_port": ["emergency_power", "비상 전원"],
  "Additional Features - Low Battery and Emergency Power": ["emergency_power", "비상 전원"],
  "additional_features_low_battery_and_emergency_power": ["emergency_power", "비상 전원"],
  "lowBatteryAndEmergencyPower": ["emergency_power", "비상 전원"],
  "Low Battery and Emergency Power": ["emergency_power", "비상 전원"],

  // door_thickness
  "Door Thickness": ["door_thickness", "도어 두께"],
  "doorThickness": ["door_thickness", "도어 두께"],
  "适用门厚度": ["door_thickness", "도어 두께"],
  "door_thickness": ["door_thickness", "도어 두께"],
  "door_thickness_range": ["door_thickness", "도어 두께"],

  // backset
  "Backset": ["backset", "백셋"],
  "关合轴距": ["backset", "백셋"],

  // ip_rating
  "방수등급": ["ip_rating", "방수방진 등급"],
  "Weather Rating": ["ip_rating", "방수방진 등급"],

  // operating_temp
  "사용온도": ["operating_temp", "사용 온도"],
  "工作温度": ["operating_temp", "사용 온도"],
  "Operating Temperature": ["operating_temp", "사용 온도"],

  // auto_lock
  "Automatic Locking": ["auto_lock", "자동잠금"],
  "Additional Features - Automatic Locking": ["auto_lock", "자동잠금"],
  "additional_features_automatic_locking": ["auto_lock", "자동잠금"],
  "automaticLocking": ["auto_lock", "자동잠금"],
  "Auto-lock": ["auto_lock", "자동잠금"],
  "auto_lock_on_close": ["auto_lock", "자동잠금"],

  // remote_control
  "Additional Features - Remote Control (Optional)": ["remote_control", "원격 제어"],
  "additional_features_remote_control_optional": ["remote_control", "원격 제어"],
  "remoteControlOptional": ["remote_control", "원격 제어"],
  "Remote Control (Optional)": ["remote_control", "원격 제어"],
  "远程升级": ["remote_control", "원격 제어"],

  // security_grade
  "security": ["security_grade", "보안 등급"],
  "보안": ["security_grade", "보안 등급"],
  "锁芯等级": ["security_grade", "보안 등급"],
  "Security Cylinder": ["security_grade", "보안 등급"],
  "Encryption": ["security_grade", "보안 등급"],
  "security_features": ["security_grade", "보안 등급"],
  "Security Features": ["security_grade", "보안 등급"],
  "防盗模式": ["security_grade", "보안 등급"],
  "보안 기능": ["security_grade", "보안 등급"],

  // installation_type
  "설치방식": ["installation_type", "설치 방식"],
  "installation": ["installation_type", "설치 방식"],
  "适用门类型": ["installation_type", "설치 방식"],
  "mortise_type": ["installation_type", "설치 방식"],
  "Locking Mechanism": ["installation_type", "설치 방식"],
  "locking_mechanism_details": ["installation_type", "설치 방식"],
  "Mortise Type": ["installation_type", "설치 방식"],
  "锁体类型": ["installation_type", "설치 방식"],
  "Locking Bolts": ["installation_type", "설치 방식"],
  "不锈钢锁舌": ["installation_type", "설치 방식"],
  "不锈钢三锁舌": ["installation_type", "설치 방식"],
  "把手类型": ["installation_type", "설치 방식"],
  "Fully automatic mortise": ["installation_type", "설치 방식"],

  // certification
  "Salt Spray Test": ["certification", "인증"],
  "Salt Spray Tested": ["certification", "인증"],
  "인증_번호": ["certification", "인증"],

  // fingerprint_capacity
  "Maximum No. of Users - Fingerprints": ["fingerprint_capacity", "지문 등록 수"],
  "maximum_no_of_users_fingerprints": ["fingerprint_capacity", "지문 등록 수"],
  "fingerprintsMaxUsers": ["fingerprint_capacity", "지문 등록 수"],
  "Face Storage": ["fingerprint_capacity", "지문 등록 수"],
  "Finger Vein Storage": ["fingerprint_capacity", "지문 등록 수"],
  "指纹容量": ["fingerprint_capacity", "지문 등록 수"],
  "卡片容量": ["fingerprint_capacity", "지문 등록 수"],
  "用户容量": ["fingerprint_capacity", "지문 등록 수"],
  "Maximum No. of Users - PIN Code": ["fingerprint_capacity", "지문 등록 수"],
  "Maximum No. of Users - RFID Card": ["fingerprint_capacity", "지문 등록 수"],
  "Maximum No. of Users - Mechanical Key Override": ["fingerprint_capacity", "지문 등록 수"],
  "Maximum No. of Users - One Time Code": ["fingerprint_capacity", "지문 등록 수"],
  "maximum_no_of_users_pin_code": ["fingerprint_capacity", "지문 등록 수"],
  "maximum_no_of_users_rfid_card": ["fingerprint_capacity", "지문 등록 수"],
  "maximum_no_of_users_mechanical_key_override": ["fingerprint_capacity", "지문 등록 수"],
  "maximum_no_of_users_one_time_code": ["fingerprint_capacity", "지문 등록 수"],
  "pinCodeMaxUsers": ["fingerprint_capacity", "지문 등록 수"],
  "rfidCardMaxUsers": ["fingerprint_capacity", "지문 등록 수"],
  "mechanicalKeyOverrideMaxUsers": ["fingerprint_capacity", "지문 등록 수"],
  "oneTimeCodeMaxUsers": ["fingerprint_capacity", "지문 등록 수"],
  "face_id_user_capacity": ["fingerprint_capacity", "지문 등록 수"],
  "pin_code_capacity": ["fingerprint_capacity", "지문 등록 수"],
  "rfid_card_capacity": ["fingerprint_capacity", "지문 등록 수"],

  // fingerprint_speed
  "Recognition Speed": ["fingerprint_speed", "지문 인식 속도"],
  "指纹对比时间": ["fingerprint_speed", "지문 인식 속도"],
  "fingerprint_match_speed": ["fingerprint_speed", "지문 인식 속도"],

  // alarm
  "alerts": ["alarm", "알림/경보"],
  "Smart Safety Alerts": ["alarm", "알림/경보"],
  "Smart Alerts": ["alarm", "알림/경보"],
  "Additional Features - Alarm (Break/ Damage)": ["alarm", "알림/경보"],
  "additional_features_alarm_break_damage": ["alarm", "알림/경보"],
  "alarmBreakDamage": ["alarm", "알림/경보"],
  "Alarm (Break/ Damage)": ["alarm", "알림/경보"],
  "报警功能": ["alarm", "알림/경보"],

  // camera
  "Camera View Angle": ["camera", "카메라"],
  "camera": ["camera", "카메라"],
  "Digital Viewer": ["camera", "카메라"],
  "digital_door_viewer": ["camera", "카메라"],
  "Display": ["camera", "카메라"],
  "indoor_screen": ["camera", "카메라"],
  "camera_resolution": ["camera", "카메라"],

  // motion_detection
  "PIR motion sensor": ["motion_detection", "동작 감지"],
  "PIR Motion Detection": ["motion_detection", "동작 감지"],
  "Indoor Sensor": ["motion_detection", "동작 감지"],
  "猫眼功能": ["motion_detection", "동작 감지"],

  // additional_features
  "부가기능": ["additional_features", "부가기능"],
  "부가기능(앱)": ["additional_features", "부가기능"],
  "features": ["additional_features", "부가기능"],
  "기능": ["additional_features", "부가기능"],
  "etc": ["additional_features", "부가기능"],
  "기본구성": ["additional_features", "부가기능"],
  "基本 구성": ["additional_features", "부가기능"],
  "Additional Features - Voice Guide": ["additional_features", "부가기능"],
  "Additional Features - Anti-Panic Egress": ["additional_features", "부가기능"],
  "Additional Features - Fake PIN Code": ["additional_features", "부가기능"],
  "Additional Features - Bluetooth Module (Optional)": ["additional_features", "부가기능"],
  "Additional Features - App Link Apps (Optional)": ["additional_features", "부가기능"],
  "additional_features_voice_guide": ["additional_features", "부가기능"],
  "additional_features_anti_panic_egress": ["additional_features", "부가기능"],
  "additional_features_fake_pin_code": ["additional_features", "부가기능"],
  "additional_features_bluetooth_module_optional": ["additional_features", "부가기능"],
  "additional_features_app_link_apps_optional": ["additional_features", "부가기능"],
  "voiceGuide": ["additional_features", "부가기능"],
  "antiPanicEgress": ["additional_features", "부가기능"],
  "fakePinCode": ["additional_features", "부가기능"],
  "bluetoothModuleOptional": ["additional_features", "부가기능"],
  "appLinkAppsOptional": ["additional_features", "부가기능"],
  "Voice Guide": ["additional_features", "부가기능"],
  "Anti-Panic Egress": ["additional_features", "부가기능"],
  "Bluetooth Module (Optional)": ["additional_features", "부가기능"],
  "App Link Apps (Optional)": ["additional_features", "부가기능"],
  "语音功能": ["additional_features", "부가기능"],
  "存储方式": ["additional_features", "부가기능"],
  "存储容量": ["additional_features", "부가기능"],

  // model_info
  "Model": ["model_info", "모델 정보"],
  "model": ["model_info", "모델 정보"],
  "제품명": ["model_info", "모델 정보"],
  "모델명": ["model_info", "모델 정보"],
  "产品型号": ["model_info", "모델 정보"],
  "锁体型号": ["model_info", "모델 정보"],
  "product_name": ["model_info", "모델 정보"],
  "제조사": ["model_info", "모델 정보"],

  // lock_form
  "도어락형태": ["lock_form", "도어락 형태"],
  "lock_type_description": ["lock_form", "도어락 형태"],

  // ai_detection (카메라)
  "ai_features": ["ai_detection", "AI 감지"],
  "야간_가시_거리": ["night_vision", "야간촬영"],
  "저장_방식": ["storage", "저장 방식"],
};

const SPEC_FIELDS: Record<string, { key: string; label: string; visible?: boolean }[]> = {
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
    { key: "alarm", label: "알림/경보" },
    { key: "additional_features", label: "부가기능" },
    { key: "model_info", label: "모델 정보", visible: false },
  ],
  카메라: [
    { key: "resolution", label: "해상도" },
    { key: "fov", label: "화각" },
    { key: "night_vision", label: "야간촬영" },
    { key: "ai_detection", label: "AI 감지" },
    { key: "storage", label: "저장 방식" },
    { key: "connectivity", label: "연결 방식" },
    { key: "smart_home_platform", label: "스마트홈 플랫폼" },
    { key: "ip_rating", label: "방수방진 등급" },
    { key: "dimensions", label: "크기" },
    { key: "weight", label: "무게" },
    { key: "color", label: "색상" },
  ],
  센서: [
    { key: "sensor_type", label: "센서 종류" },
    { key: "detection_range", label: "감지 범위" },
    { key: "connectivity", label: "연결 방식" },
    { key: "smart_home_platform", label: "스마트홈 플랫폼" },
    { key: "battery_type", label: "배터리 종류" },
    { key: "dimensions", label: "크기" },
    { key: "color", label: "색상" },
  ],
  허브: [
    { key: "supported_protocols", label: "지원 프로토콜" },
    { key: "connectivity", label: "연결 방식" },
    { key: "smart_home_platform", label: "스마트홈 플랫폼" },
    { key: "max_devices", label: "최대 기기 수" },
    { key: "dimensions", label: "크기" },
    { key: "color", label: "색상" },
  ],
  조명: [
    { key: "bulb_type", label: "전구 타입" },
    { key: "brightness", label: "밝기" },
    { key: "color_temp", label: "색온도" },
    { key: "connectivity", label: "연결 방식" },
    { key: "smart_home_platform", label: "스마트홈 플랫폼" },
    { key: "dimensions", label: "크기" },
    { key: "color", label: "색상" },
  ],
  스위치: [
    { key: "switch_type", label: "스위치 종류" },
    { key: "connectivity", label: "연결 방식" },
    { key: "smart_home_platform", label: "스마트홈 플랫폼" },
    { key: "dimensions", label: "크기" },
    { key: "color", label: "색상" },
    { key: "material", label: "소재" },
  ],
};

export async function POST() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const results: string[] = [];
  let totalUpdated = 0;

  const { data: allSpecs, error: fetchErr } = await supabase
    .from("specs")
    .select("id, field_key, field_label, value");

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  results.push(`Total specs: ${allSpecs?.length || 0}`);

  for (const spec of allSpecs || []) {
    const mapping = MAP[spec.field_key];
    if (mapping && mapping[0] !== spec.field_key) {
      let value = spec.value;
      if (value && value.includes(",")) {
        value = value.split(",").map((v: string) => v.trim()).filter(Boolean).sort().join(", ");
      }
      const { error } = await supabase
        .from("specs")
        .update({ field_key: mapping[0], field_label: mapping[1], value })
        .eq("id", spec.id);
      if (!error) totalUpdated++;
    }
  }

  results.push(`Specs updated: ${totalUpdated}`);

  // Dedup
  const { data: all2 } = await supabase
    .from("specs")
    .select("id, product_id, field_key")
    .order("id", { ascending: true });

  const seen = new Set<string>();
  const toDelete: string[] = [];
  for (const s of all2 || []) {
    const key = `${s.product_id}|${s.field_key}`;
    if (seen.has(key)) toDelete.push(s.id);
    else seen.add(key);
  }

  if (toDelete.length > 0) {
    for (let i = 0; i < toDelete.length; i += 100) {
      await supabase.from("specs").delete().in("id", toDelete.slice(i, i + 100));
    }
    results.push(`Duplicates removed: ${toDelete.length}`);
  }

  // Update spec_fields
  for (const [cat, fields] of Object.entries(SPEC_FIELDS)) {
    await supabase.from("spec_fields").delete().eq("category", cat);
    const rows = fields.map((f, i) => ({
      category: cat,
      field_key: f.key,
      field_label: f.label,
      sort_order: i,
      is_visible: f.visible !== false,
    }));
    await supabase.from("spec_fields").insert(rows);
    results.push(`${cat}: ${fields.length} fields`);
  }

  return NextResponse.json({ ok: true, results, totalUpdated, duplicatesRemoved: toDelete.length });
}
