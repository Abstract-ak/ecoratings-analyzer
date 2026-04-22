import { OpenAI } from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EXTRACTION_PROMPT = `
You are an ESG data extraction specialist. Given the text excerpt below from a sustainability report,
extract ALL quantitative and qualitative ESG metrics you can find.

Return a JSON object with this exact structure (use null for missing fields):
{
  "environmental": {
    "scope1Emissions": { "value": number|null, "unit": "tCO2e"|null },
    "scope2Emissions": { "value": number|null, "unit": "tCO2e"|null },
    "scope3Emissions": { "value": number|null, "unit": "tCO2e"|null },
    "totalEnergyConsumption": { "value": number|null, "unit": "GJ"|null },
    "renewableEnergyPercent": { "value": number|null, "unit": "%"|null },
    "waterWithdrawal": { "value": number|null, "unit": "ML"|null },
    "wasteGenerated": { "value": number|null, "unit": "tonnes"|null },
    "wasteDiversionRate": { "value": number|null, "unit": "%"|null }
  },
  "social": {
    "totalEmployees": { "value": number|null, "unit": "persons"|null },
    "womenPercent": { "value": number|null, "unit": "%"|null },
    "lostTimeInjuryRate": { "value": number|null, "unit": "per million hours"|null },
    "trainingHoursPerEmployee": { "value": number|null, "unit": "hours"|null },
    "communityInvestment": { "value": number|null, "unit": "USD"|null }
  },
  "governance": {
    "boardSize": { "value": number|null, "unit": "members"|null },
    "independentDirectorsPercent": { "value": number|null, "unit": "%"|null },
    "womenOnBoardPercent": { "value": number|null, "unit": "%"|null },
    "corruptionIncidents": { "value": number|null, "unit": "incidents"|null },
    "antiCorruptionPolicyExists": true|false|null
  },
  "reportingYear": string|null,
  "companyName": string|null
}

Return ONLY valid JSON, no markdown, no explanation.
`;

/**
 * Calls GPT to extract structured metrics from a document context string.
 */
async function run(context) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are an ESG data extraction specialist.",
      },
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\n--- DOCUMENT EXCERPT ---\n${context}`,
      },
    ],
    temperature: 0,
  });

  const text = response.choices[0]?.message?.content || "{}";

  try {
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch {
    return { parseError: true, raw: text };
  }
}

export default { run };
