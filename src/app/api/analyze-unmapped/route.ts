import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { unmapped, existing } = await request.json();

  if (!unmapped?.length || !existing?.length) {
    return NextResponse.json({ mappings: {} });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ mappings: {} }, { status: 500 });
  }

  const BATCH_SIZE = 100;
  const allMappings: Record<string, string> = {};

  for (let i = 0; i < unmapped.length; i += BATCH_SIZE) {
    const batch = unmapped.slice(i, i + BATCH_SIZE);

    const prompt = `너는 스펙 항목 매칭 전문가야.
아래 "매핑되지 않은 항목" 각각이 "기존 항목" 중 의미가 같은 것과 매칭되는지 판단해.

기존 항목:
${existing.map((e: any) => `- ${e.field_key} (${e.field_label}) [${e.category}]`).join("\n")}

매핑되지 않은 항목:
${batch.map((u: any) => `- ${u.key} (${u.label})`).join("\n")}

규칙:
- 의미가 같으면 기존 항목의 field_key를 반환
- 의미가 다르면 "new" 반환
- 애매하면 "new" 반환 (보수적으로)

JSON으로만 답해:
{ "${batch[0]?.key}": "existing_key_or_new", ... }`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        Object.assign(allMappings, parsed);
      }
    } catch (e) {
      console.error("Gemini analyze-unmapped error:", e);
    }
  }

  return NextResponse.json({ mappings: allMappings });
}
