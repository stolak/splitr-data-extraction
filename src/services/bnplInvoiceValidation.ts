import type {
  BnplInvoiceValidationInput,
  BnplInvoiceValidationResult,
} from "../types/invoiceExtraction";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function validateInvoiceForBnpl(input: BnplInvoiceValidationInput): BnplInvoiceValidationResult {
  const reasons: string[] = [];
  const minimumConfidence = input.minimumConfidence ?? 0.75;

  if (!input.invoice.merchantName) reasons.push("Merchant could not be reliably identified.");
  if (input.invoice.totalAmount === null || input.invoice.totalAmount <= 0) {
    reasons.push("Invoice total could not be reliably identified.");
  }
  if (!input.invoice.invoiceDate) reasons.push("Invoice date could not be reliably identified.");
  if (input.invoice.confidence.overall < minimumConfidence) {
    reasons.push("Overall invoice extraction confidence is below the BNPL threshold.");
  }

  if (input.selectedMerchantName && input.invoice.merchantName) {
    const selected = normalize(input.selectedMerchantName);
    const detected = normalize(input.invoice.merchantName);
    if (!selected.includes(detected) && !detected.includes(selected)) {
      reasons.push("Invoice merchant does not match the selected merchant.");
    }
  }

  if (input.requestedAmount !== undefined && input.invoice.totalAmount !== null) {
    const difference = Math.abs(input.invoice.totalAmount - input.requestedAmount);
    if (difference > 0.01) reasons.push("Invoice total does not match the requested BNPL amount.");
  }

  return { approvedForNextStep: reasons.length === 0, reasons };
}
