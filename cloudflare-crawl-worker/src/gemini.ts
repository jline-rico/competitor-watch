const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const CATEGORIES = ["카메라", "도어락", "센서", "허브", "조명", "스위치", "기타"];

const STANDARD_SPEC_FIELDS: Record<string, { key: string; label: string }[]> = {
  도어락: [
    { key: "unlock_method", label: "잠금해제 방식" },
    { key: "connectivity", label: "연결 방식" },
    { key: "protocol", label: "통신 프로토콜" },
    { key: "power_source", label: "전원" },
    { key: "battery_type", label: "배터리 종류" },
    { key: "battery_life", label: "배터리 수명" },
    { key: "dimensions", label: "크기" },
    { key: "weight", label: "무게" },
    { key: "material", label: "소재" },
    { key: "color", label: "색상" },
    { key: "installation_type", label: "설치 방식" },
    { key: "door_thickness", label: "도어 두께" },
    { key: "auto_lock", label: "자동잠금" },
    { key: "emergency_power", label: "비상전원" },
    { key: "waterproof", label: "방수등급" },
    { key: "operating_temp", label: "동작온도" },
    { key: "certification", label: "인증" },
    { key: "voice_assistant", label: "음성비서 지원" },
    { key: "remote_control", label: "원격제어" },
    { key: "max_fingerprints", label: "최대 지문 수" },
    { key: "max_passwords", label: "최대 비밀번호 수" },
    { key: "max_cards", label: "최대 카드 수" },
    { key: "max_users", label: "최대 사용자 수" },
  ],
  카메라: [
    { key: "resolution", label: "해상도" },
    { key: "field_of_view", label: "화각" },
    { key: "night_vision", label: "야간촬영" },
    { key: "storage", label: "저장방식" },
    { key: "connectivity", label: "연결 방식" },
    { key: "protocol", label: "통신 프로토콜" },
    { key: "power_source", label: "전원" },
    { key: "waterproof", label: "방수등급" },
    { key: "dimensions", label: "크기" },
    { key: "weight", label: "무게" },
    { key: "two_way_audio", label: "양방향 오디오" },
    { key: "motion_detection", label: "모션감지" },
    { key: "ai_detection", label: "AI 감지" },
    { key: "pan_tilt", label: "팬틸트" },
    { key: "zoom", label: "줌" },
    { key: "video_codec", label: "비디오 코덱" },
    { key: "operating_temp", label: "동작온도" },
    { key: "certification", label: "인증" },
  ],
  센서: [
    { key: "sensor_type", label: "센서 종류" },
    { key: "connectivity", label: "연결 방식" },
    { key: "protocol", label: "통신 프로토콜" },
    { key: "power_source", label: "전원" },
    { key: "battery_type", label: "배터리 종류" },
    { key: "battery_life", label: "배터리 수명" },
    { key: "detection_range", label: "감지 범위" },
    { key: "detection_angle", label: "감지 각도" },
    { key: "dimensions", label: "크기" },
    { key: "weight", label: "무게" },
    { key: "waterproof", label: "방수등급" },
    { key: "operating_temp", label: "동작온도" },
    { key: "certification", label: "인증" },
  ],
  허브: [
    { key: "connectivity", label: "연결 방식" },
    { key: "protocol", label: "통신 프로토콜" },
    { key: "max_devices", label: "최대 연결 기기 수" },
    { key: "power_source", label: "전원" },
    { key: "dimensions", label: "크기" },
    { key: "weight", label: "무게" },
    { key: "voice_assistant", label: "음성비서 지원" },
    { key: "operating_temp", label: "동작온도" },
    { key: "certification", label: "인증" },
  ],
  조명: [
    { key: "brightness", label: "밝기" },
    { key: "color_temp", label: "색온도" },
    { key: "wattage", label: "소비전력" },
    { key: "voltage", label: "전압" },
    { key: "connectivity", label: "연결 방식" },
    { key: "protocol", label: "통신 프로토콜" },
    { key: "dimmable", label: "조광 기능" },
    { key: "dimensions", label: "크기" },
    { key: "weight", label: "무게" },
    { key: "lifespan", label: "수명" },
    { key: "socket_type", label: "소켓 타입" },
    { key: "waterproof", label: "방수등급" },
    { key: "certification", label: "인증" },
  ],
  스위치: [
    { key: "switch_type", label: "스위치 종류" },
    { key: "connectivity", label: "연결 방식" },
    { key: "protocol", label: "통신 프로토콜" },
    { key: "power_source", label: "전원" },
    { key: "max_load", label: "최대 부하" },
    { key: "voltage", label: "전압" },
    { key: "gang_count", label: "갱 수" },
    { key: "dimensions", label: "크기" },
    { key: "weight", label: "무게" },
    { key: "material", label: "소재" },
    { key: "color", label: "색상" },
    { key: "certification", label: "인증" },
  ],
};

function getStandardFieldsPrompt(): string {
  const lines: string[] = [];
  for (const [cat, fields] of Object.entries(STANDARD_SPEC_FIELDS)) {
    lines.push(`[${cat}] ${fields.map((f) => `${f.key}(${f.label})`).join(", ")}`);
  }
  return lines.join("\n");
}

export interface CatalogProduct {
  name: string;
  url: string;
}

export interface ExtractedProduct {
  name: string;
  model: string | null;
  category: string;
  price: number | null;
  currency: string | null;
  image_url: string | null;
  specs: { key: string; label: string; value: string }[];
}

const TOKEN_LIMIT = 1_000_000;
let totalTokensUsed = 0;

export function getTokensUsed(): number {
  return totalTokensUsed;
}

export function resetTokensUsed(): void {
  totalTokensUsed = 0;
}

async function callGemini(apiKey: string, contents: unknown[]): Promise<string> {
  if (totalTokensUsed >= TOKEN_LIMIT) {
    throw new Error(`Token limit reached (${totalTokensUsed.toLocaleString()} / ${TOKEN_LIMIT.toLocaleString()})`);
  }

  const res = await fetch(`${GEMINI_BASE}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { totalTokenCount?: number };
  };

  const tokens = data.usageMetadata?.totalTokenCount || 0;
  totalTokensUsed += tokens;

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text.replace(/```json\n?/g, "").replace(/```/g, "").trim();
}

export async function extractCatalogList(
  apiKey: string,
  html: string,
  competitorName: string,
  baseUrl: string,
): Promise<CatalogProduct[]> {
  const prompt = `너는 HTML 파서야. 추론하지 마.
이 HTML은 ${competitorName}의 공식 제품 카탈로그 페이지야.
페이지에 나열된 모든 제품의 이름과 상세 페이지 URL을 추출해.
상대 URL은 ${baseUrl}을 기준으로 절대 URL로 변환해.

출력: [{ "name": "...", "url": "..." }]
HTML에 없는 제품을 추가하지 마. JSON 배열만 반환해.`;

  const text = await callGemini(apiKey, [{ parts: [{ text: prompt }, { text: html }] }]);
  try {
    return JSON.parse(text) as CatalogProduct[];
  } catch {
    return [];
  }
}

export async function extractProductSpecs(
  apiKey: string,
  html: string,
): Promise<ExtractedProduct | null> {
  const prompt = `너는 HTML 파서야. 추론하지 마. 검색하지 마.
주어진 HTML에 명시적으로 적혀있는 정보만 추출해.

규칙:
- HTML에 없는 정보는 절대 채우지 마. null로 남겨.
- 가격은 표시된 숫자 그대로 (반올림/올림 금지)
- 스펙은 스펙표/상세정보 섹션에서만 추출
- 이미지는 제품 메인 이미지 URL만

스펙 key/label 정규화 규칙 (매우 중요):
- 아래 표준 필드 목록에서 의미가 일치하는 key를 반드시 사용해
- 원문이 영어/중국어/일본어여도 아래 한국어 label로 통일
- 표준 목록에 없는 항목만 새 key를 만들되, 반드시 영문 snake_case + 한국어 label
- 같은 의미의 항목을 다른 key로 만들지 마 (예: "锁体材质"→material(소재), "Lock Type"→unlock_method(잠금해제 방식))
- 값이 여러 항목 나열인 경우 (쉼표 구분) 알파벳/가나다 순으로 정렬

표준 필드 목록:
${getStandardFieldsPrompt()}

출력 (JSON만 반환):
{
  "name": "...",
  "model": "...",
  "category": "...",
  "price": null,
  "currency": null,
  "image_url": "...",
  "specs": [{ "key": "...", "label": "...", "value": "..." }]
}

category는 다음 중 하나: ${CATEGORIES.join(", ")}
매칭되지 않으면 "기타"로 설정.`;

  const text = await callGemini(apiKey, [{ parts: [{ text: prompt }, { text: html }] }]);
  try {
    return JSON.parse(text) as ExtractedProduct;
  } catch {
    return null;
  }
}

export async function extractSpecsFromImage(
  apiKey: string,
  screenshotBase64: string,
): Promise<ExtractedProduct | null> {
  const prompt = `이 스크린샷은 제품 상세 페이지야.
이미지에 보이는 제품명, 모델명, 가격, 스펙 항목과 값을 정확히 그대로 읽어서 JSON으로 반환해.
추론하거나 보충하지 마. 안 보이면 null.

스펙 key/label 정규화 규칙 (매우 중요):
- 아래 표준 필드 목록에서 의미가 일치하는 key를 반드시 사용해
- 원문이 영어/중국어/일본어여도 아래 한국어 label로 통일
- 표준 목록에 없는 항목만 새 key를 만들되, 반드시 영문 snake_case + 한국어 label
- 값이 여러 항목 나열인 경우 (쉼표 구분) 알파벳/가나다 순으로 정렬

표준 필드 목록:
${getStandardFieldsPrompt()}

출력 (JSON만 반환):
{
  "name": "...",
  "model": "...",
  "category": "...",
  "price": null,
  "currency": null,
  "image_url": null,
  "specs": [{ "key": "...", "label": "...", "value": "..." }]
}

category는 다음 중 하나: ${CATEGORIES.join(", ")}`;

  const contents = [
    {
      parts: [
        { text: prompt },
        { inline_data: { mime_type: "image/png", data: screenshotBase64 } },
      ],
    },
  ];

  const text = await callGemini(apiKey, contents);
  try {
    return JSON.parse(text) as ExtractedProduct;
  } catch {
    return null;
  }
}

export { STANDARD_SPEC_FIELDS };

export async function normalizeFieldKeys(
  apiKey: string,
  category: string,
  uniqueKeys: string[],
): Promise<{ old_key: string; new_key: string; new_label: string }[]> {
  const stdFields = (STANDARD_SPEC_FIELDS[category] || []).map((f) => `${f.key}(${f.label})`).join(", ");

  const prompt = `기존 스펙 데이터의 field_key|field_label 목록을 표준 키로 매핑해줘.

카테고리: ${category}
기존 키 목록 (${uniqueKeys.length}개):
${uniqueKeys.join("\n")}

표준 필드 목록:
${stdFields}

규칙:
- 기존 키가 표준 키와 의미가 같으면 표준 key와 label로 매핑
- 중국어/영어/일본어 항목명도 의미 파악해서 매핑 (예: "锁体材质"→material|소재)
- 표준 목록에 없는 항목은 영문 snake_case key + 한국어 label로 통일
- 같은 의미의 항목은 반드시 같은 key로 통일
- 이미 표준과 동일한 항목은 생략해도 됨 (변경이 필요한 것만)

출력 (JSON 배열만 반환):
[{ "old_key": "기존field_key", "new_key": "표준key", "new_label": "한국어라벨" }]`;

  const text = await callGemini(apiKey, [{ parts: [{ text: prompt }] }]);
  return JSON.parse(text) as { old_key: string; new_key: string; new_label: string }[];
}

export async function researchProductByName(
  apiKey: string,
  productName: string,
  competitorName: string,
  emptySpecs: { key: string; label: string }[],
  needsPrice = false,
): Promise<ExtractedProduct | null> {
  const specsRequest = emptySpecs.length > 0
    ? `\n다음 항목의 값을 반드시 찾아서 채워줘:\n${emptySpecs.map((s) => `- ${s.label} (key: ${s.key})`).join("\n")}`
    : "\n이 제품의 주요 스펙을 찾아줘.";

  const priceRequest = needsPrice
    ? "\n가격 정보도 반드시 찾아줘 (price, currency 필드)."
    : "";

  const prompt = `너는 제품 리서치 전문가야.
${competitorName}의 "${productName}" 제품에 대해 웹 검색으로 스펙 정보를 찾아줘.${specsRequest}${priceRequest}

규칙:
- 공식 사이트나 신뢰할 수 있는 출처의 정보만 사용
- 확실하지 않은 정보는 포함하지 마
- 요청한 항목의 key와 label을 그대로 사용해서 반환해

출력 (JSON만 반환):
{
  "name": "...",
  "model": "...",
  "category": "...",
  "price": null,
  "currency": null,
  "image_url": null,
  "specs": [{ "key": "...", "label": "...", "value": "..." }]
}

category는 다음 중 하나: ${CATEGORIES.join(", ")}`;

  const text = await callGemini(apiKey, [{ parts: [{ text: prompt }] }]);
  try {
    return JSON.parse(text) as ExtractedProduct;
  } catch {
    return null;
  }
}
