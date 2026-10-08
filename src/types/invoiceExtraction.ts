export type SupportedFileType = "pdf" | "png" | "jpeg";

export type SupportedCurrency = "CAD" | "USD" | "NGN" | "GBP" | "EUR" | "UNKNOWN";

export interface InvoiceItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  confidence: number;
}

export interface ExtractedInvoice {
  rawText?: string;
  merchantName: string | null;
  totalAmount: number | null;
  currency: SupportedCurrency;
  invoiceDate: string | null;
  items: InvoiceItem[];
  confidence: {
    merchant: number;
    total: number;
    date: number;
    items: number;
    overall: number;
  };
  extraction: {
    source: "pdf-text" | "ocr";
    pages: number;
    ocrUsed: boolean;
    rawText?: string;
  };
}

export interface ExtractionOptions {
  includeRawText?: boolean;
}

export interface BnplInvoiceValidationInput {
  invoice: ExtractedInvoice;
  selectedMerchantName?: string;
  requestedAmount?: number;
  minimumConfidence?: number;
}

export interface BnplInvoiceValidationResult {
  approvedForNextStep: boolean;
  reasons: string[];
}
