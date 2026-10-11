import OpenAI from "openai";
import { extractionConfig } from "./extractionConfig";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are an invoice extraction engine.

Return ONLY a valid JSON object matching the provided schema.
No explanations.
No markdown.
No extra keys.
If unsure, return null.
Never return invented values.

========================================
INPUT
========================================
- text: invoice or receipt text
- the submitted text is the ONLY source of truth

========================================
FIELDS
========================================

merchantName:
- the business that issued the invoice or receipt
- null when it is not present

totalAmount:
- the final amount payable
- a number with no currency symbol
- null when it is not present
- do not use a subtotal, tax, or line-item price when a final total is present

========================================
ABSOLUTE GROUNDING RULES
========================================

- ALL values MUST come from the submitted text
- NEVER invent a merchant
- NEVER invent an amount
- NEVER estimate

If no evidence:
- return null

========================================
FINAL OUTPUT RULES
========================================

- JSON ONLY
- numbers must be numbers
- strictly follow schema
- no extra keys
- no missing keys
- prefer null over guessing
`;

export interface TextExtractionResult {
  merchantName: string | null;
  totalAmount: number | null;
  text: string;
}

export const TextExtractionResultSchema = {
  type: "object",
  additionalProperties: false,
  required: ["merchantName", "totalAmount"],
  properties: {
    merchantName: { type: ["string", "null"] },
    totalAmount: { type: ["number", "null"] },
  },
} as const;

function asMerchantName(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asTotalAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[,\s]/g, "").replace(/^[^\d.-]+/, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export const openaiTextExtractionService = {
  async extract(text: string): Promise<TextExtractionResult> {
    if (!extractionConfig.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const response = await client.responses.create({
      model: extractionConfig.openaiModel,
      store: false,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: SYSTEM_PROMPT.trim(),
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Extract the merchant and total from the following invoice text and return the required output JSON only.\n\n" +
                text,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "invoice_text_extraction",
          schema: TextExtractionResultSchema,
          strict: true,
        },
      },
    });

    if (!response.output_text) {
      throw new Error("OpenAI returned an empty extraction.");
    }

    let parsed: { merchantName?: unknown; totalAmount?: unknown };
    try {
      parsed = JSON.parse(response.output_text) as { merchantName?: unknown; totalAmount?: unknown };
    } catch {
      throw new Error("OpenAI returned an unreadable extraction.");
    }

    return {
      merchantName: asMerchantName(parsed.merchantName),
      totalAmount: asTotalAmount(parsed.totalAmount),
      text,
    };
  },
};
