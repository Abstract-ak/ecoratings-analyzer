import { readFileSync } from "node:fs";
import { OpenAI } from "openai";

const griFramework = JSON.parse(
  readFileSync(new URL("../data/gri-frameworks.json", import.meta.url), "utf8"),
);

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const FRAMEWORKS = { GRI: griFramework };

/**
 * For each disclosure item in the framework checklist, ask GPT
 * to classify it as "present", "partial", or "missing"
 */
async function run(context, framework = "GRI") {
  const checklist = FRAMEWORKS[framework];
  if (!checklist) throw new Error(`Framework ${framework} not yet implemented`);

  const prompt = `
You are an ESG compliance analyst. Given the document excerpt below and the framework checklist,
determine for each disclosure item whether it is:
  - "present"  : clearly disclosed with data or explicit statement
  - "partial"  : mentioned but incomplete, vague, or lacking quantification
  - "missing"  : no mention found in the excerpt

Return a JSON array, one object per item:
[
  {
    "id": "<disclosure id>",
    "title": "<title>",
    "status": "present" | "partial" | "missing",
    "evidence": "<short quote or reason — max 120 chars>"
  }
]

FRAMEWORK CHECKLIST (${framework}):
${JSON.stringify(checklist, null, 2)}

DOCUMENT EXCERPT:
${context}

Return ONLY valid JSON array, no markdown.
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini", // cost-efficient + good accuracy
    messages: [
      { role: "system", content: "You are an ESG compliance analyst." },
      { role: "user", content: prompt },
    ],
    temperature: 0,
  });

  const text = response.choices[0]?.message?.content || "[]";

  try {
    const results = JSON.parse(text.replace(/```json|```/g, "").trim());

    return results.map((item) => {
      const original = checklist.find((c) => c.id === item.id);
      return { ...item, category: original?.category || "General" };
    });
  } catch {
    return [{ parseError: true, raw: text }];
  }
}

export default { run };
