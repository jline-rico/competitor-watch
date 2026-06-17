const GEMINI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

const CATEGORIES = ["카메라", "도어락", "센서", "허브", "조명", "스위치", "기타"];

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

async function callGemini(apiKey: string, contents: unknown[]): Promise<string> {
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
  };
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
- source 필드는 반드시 "official"로 설정

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
