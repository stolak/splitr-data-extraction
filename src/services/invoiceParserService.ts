import type { ExtractedInvoice, InvoiceItem, SupportedCurrency } from "../types/invoiceExtraction";
import { clamp, lines, normalizeForMatch } from "../utils/extractionText";

const TOTAL_LABELS = [
  "grand total",
  "total due",
  "amount due",
  "invoice total",
  "order total",
  "balance due",
  "total payable",
  "total",
];

const STOP_ITEM_LABELS = [
  "subtotal",
  "sub total",
  "tax",
  "gst",
  "hst",
  "pst",
  "vat",
  "shipping",
  "delivery",
  "discount",
  "coupon",
  "payment",
  "amount due",
  "grand total",
  "total due",
  "balance due",
  "change",
];

const DATE_LABELS = ["invoice date", "order date", "purchase date", "date", "issued"];

const ADDRESS_WORDS = [
  "street",
  "st.",
  "road",
  "rd",
  "avenue",
  "ave",
  "drive",
  "dr",
  "suite",
  "toronto",
  "ontario",
  "canada",
  "nigeria",
  "lagos",
  "abuja",
];

const MERCHANT_IGNORE = [
  "invoice",
  "receipt",
  "order",
  "tax invoice",
  "sales receipt",
  "thank you",
];

function parseMoney(value: string): number | null {
  const cleaned = value.replace(/[\s,]/g, "").replace(/(?:CAD|USD|NGN|GBP|EUR)$/i, "");
  const match = cleaned.match(/(?:[$₦€£])?(-?\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : null;
}

function moneyCandidates(
  line: string
): Array<{ amount: number; currency: SupportedCurrency; index: number }> {
  const regex =
    /(?:\b(CAD|USD|NGN|GBP|EUR)\s*)?([$₦€£])?\s*(-?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|-?\d+(?:\.\d{1,2})?)/gi;
  const results: Array<{ amount: number; currency: SupportedCurrency; index: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    const currencyText = (match[1] ?? "").toUpperCase();
    const symbol = match[2];
    const currency: SupportedCurrency =
      currencyText === "CAD" ||
      currencyText === "USD" ||
      currencyText === "NGN" ||
      currencyText === "GBP" ||
      currencyText === "EUR"
        ? currencyText
        : symbol === "₦"
          ? "NGN"
          : symbol === "£"
            ? "GBP"
            : symbol === "€"
              ? "EUR"
              : "UNKNOWN";
    const amount = parseMoney(match[0]);
    if (amount !== null) results.push({ amount, currency, index: match.index });
  }
  return results;
}

function parseCurrency(text: string): SupportedCurrency {
  const upper = text.toUpperCase();
  if (/\bCAD\b|\$/.test(upper) && /CANADA|ONTARIO|BC|ALBERTA/.test(upper)) return "CAD";
  if (/₦|\bNGN\b/.test(upper)) return "NGN";
  if (/\bCAD\b/.test(upper)) return "CAD";
  if (/\bUSD\b/.test(upper)) return "USD";
  if (/\bGBP\b|£/.test(upper)) return "GBP";
  if (/\bEUR\b|€/.test(upper)) return "EUR";
  return "UNKNOWN";
}

function extractTotal(textLines: string[]) {
  const candidates: Array<{ amount: number; currency: SupportedCurrency; score: number }> = [];
  textLines.forEach((line, index) => {
    const normalized = normalizeForMatch(line);
    const labelIndex = TOTAL_LABELS.findIndex((label) => normalized.includes(label));
    if (labelIndex < 0) return;
    for (const value of moneyCandidates(line)) {
      candidates.push({
        amount: value.amount,
        currency: value.currency,
        score:
          1 +
          (TOTAL_LABELS.length - labelIndex) / 10 +
          (index / Math.max(textLines.length, 1)) * 0.01,
      });
    }
  });

  candidates.sort((left, right) => right.score - left.score);
  const best = candidates[0];
  if (best) {
    return { ...best, confidence: clamp(0.75 + Math.min(best.score / 20, 0.24)) };
  }

  const largest = textLines
    .flatMap((line) => moneyCandidates(line))
    .sort((left, right) => right.amount - left.amount)[0];
  return largest
    ? { ...largest, score: 0, confidence: 0.35 }
    : { amount: null, currency: "UNKNOWN" as SupportedCurrency, score: 0, confidence: 0 };
}

function parseDate(textLines: string[]): { date: string | null; confidence: number } {
  const monthNames =
    "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
  const patterns = [
    new RegExp(`\\b${monthNames}\\s+\\d{1,2}(?:st|nd|rd|th)?[,]?\\s+\\d{4}\\b`, "i"),
    /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/,
    /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/,
  ];

  for (const line of textLines) {
    const normalized = normalizeForMatch(line);
    if (!DATE_LABELS.some((label) => normalized.includes(label))) continue;
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (!match) continue;
      const parsed = new Date(match[0]);
      if (!Number.isNaN(parsed.getTime())) {
        return { date: parsed.toISOString().slice(0, 10), confidence: 0.95 };
      }
      const iso = match[0].replace(/\//g, "-");
      if (/^\d{4}-/.test(iso)) return { date: iso, confidence: 0.9 };
    }
  }

  for (const line of textLines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (!match) continue;
      const parsed = new Date(match[0]);
      if (!Number.isNaN(parsed.getTime())) {
        return { date: parsed.toISOString().slice(0, 10), confidence: 0.55 };
      }
    }
  }
  return { date: null, confidence: 0 };
}

function extractMerchant(textLines: string[]): { name: string | null; confidence: number } {
  const firstLines = textLines.slice(0, Math.min(15, textLines.length));
  for (const line of firstLines) {
    const normalized = normalizeForMatch(line);
    if (!normalized || MERCHANT_IGNORE.includes(normalized)) continue;
    if (/^(invoice|receipt|order|tax invoice|sales receipt)\b/i.test(line)) continue;
    if (/^\d+[\w\s.-]+(?:street|st|road|rd|avenue|ave|drive|dr)\b/i.test(line)) continue;
    if (ADDRESS_WORDS.some((word) => normalized.includes(word))) continue;
    if (/^#?\d{3,}/.test(line) || /\b(?:phone|tel|email|www|http)\b/i.test(line)) continue;
    if (line.length >= 2 && line.length <= 80 && !/^\$?[\d.,-]+$/.test(line)) {
      const looksCompany =
        /\b(inc|ltd|llc|corp|corporation|limited|store|shop|canada|walmart|amazon|best buy|apple|ikea|samsung|jumia)\b/i.test(
          line
        );
      return { name: line, confidence: looksCompany ? 0.92 : 0.68 };
    }
  }
  return { name: null, confidence: 0 };
}

function extractItems(textLines: string[], totalAmount: number | null): InvoiceItem[] {
  const items: InvoiceItem[] = [];
  let inItems = false;
  for (const line of textLines) {
    const normalized = normalizeForMatch(line);
    if (
      STOP_ITEM_LABELS.some((label) => normalized === label || normalized.startsWith(`${label} `))
    ) {
      if (inItems) break;
      continue;
    }

    const money = moneyCandidates(line);
    if (money.length === 0) {
      if (inItems && line.length > 3 && !/^\d+[.)]/.test(line)) {
        const previous = items[items.length - 1];
        if (previous && previous.description.length < 160) previous.description += ` ${line}`;
      }
      continue;
    }

    const value = money[money.length - 1];
    const before = line.slice(0, value.index).trim();
    if (!before || STOP_ITEM_LABELS.some((label) => normalized.startsWith(label))) continue;

    const qtyMatch = before.match(/(?:^|\s)(\d+(?:\.\d+)?)\s*$/);
    const quantity = qtyMatch ? Number(qtyMatch[1]) : null;
    const description = (qtyMatch ? before.slice(0, qtyMatch.index).trim() : before)
      .replace(/^[-*•]+\s*/, "")
      .replace(/\s+/g, " ")
      .trim();

    if (description.length >= 3 && !/^\d+$/.test(description)) {
      inItems = true;
      items.push({
        description,
        quantity,
        unitPrice: quantity && quantity > 0 ? Number((value.amount / quantity).toFixed(2)) : null,
        totalPrice: value.amount,
        confidence: 0.75,
      });
    }
  }

  const onlyItem = items[0];
  if (
    totalAmount !== null &&
    items.length === 1 &&
    onlyItem?.totalPrice !== null &&
    onlyItem.totalPrice <= totalAmount
  ) {
    onlyItem.confidence = clamp(onlyItem.confidence + 0.15);
  }
  return items.slice(0, 50);
}

export function parseInvoice(
  text: string,
  source: "pdf-text" | "ocr",
  pages: number,
  ocrUsed: boolean,
  ocrConfidence: number,
  includeRawText = false
): ExtractedInvoice {
  const textLines = lines(text);
  const merchant = extractMerchant(textLines);
  const total = extractTotal(textLines);
  const date = parseDate(textLines);
  const items = extractItems(textLines, total.amount);
  const itemConfidence = items.length
    ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length
    : 0;
  const overall =
    clamp(
      merchant.confidence * 0.25 +
        total.confidence * 0.35 +
        date.confidence * 0.15 +
        itemConfidence * 0.25
    ) * (ocrUsed ? Math.max(0.75, ocrConfidence) : 1);

  return {
    merchantName: merchant.name,
    totalAmount: total.amount,
    currency: total.currency !== "UNKNOWN" ? total.currency : parseCurrency(text),
    invoiceDate: date.date,
    items,
    confidence: {
      merchant: Number(merchant.confidence.toFixed(2)),
      total: Number(total.confidence.toFixed(2)),
      date: Number(date.confidence.toFixed(2)),
      items: Number(itemConfidence.toFixed(2)),
      overall: Number(overall.toFixed(2)),
    },
    extraction: {
      source,
      pages,
      ocrUsed,
      ...(includeRawText ? { rawText: text } : {}),
    },
    rawText: text,
  };
}
