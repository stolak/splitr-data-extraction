import type { ExtractedInvoice, ExtractionOptions } from "../types/invoiceExtraction";
import { detectFileType } from "../utils/fileSignature";
import { cleanText } from "../utils/extractionText";
import { ocrService } from "./ocrService";
import { pdfExtractionService } from "./pdfExtractionService";
import { parseInvoice } from "./invoiceParserService";

export class InvoiceExtractionService {
  async extract(buffer: Buffer, options: ExtractionOptions = {}): Promise<ExtractedInvoice> {
    const type = await detectFileType(buffer);
    if (!type) {
      throw new Error("Unsupported or invalid file. Only PDF, PNG and JPEG are accepted.");
    }

    if (type === "pdf") return this.extractPdf(buffer, options);
    return this.extractImage(buffer, options);
  }

  private async extractImage(buffer: Buffer, options: ExtractionOptions) {
    const result = await ocrService.recognize(buffer);
    // console.log("result", result.text);
    const text = cleanText(result.text);
    if (!text) throw new Error("No readable text was detected in the image.");
    return parseInvoice(text, "ocr", 1, true, result.confidence, options.includeRawText);
  }

  private async extractPdf(buffer: Buffer, options: ExtractionOptions) {
    const result = await pdfExtractionService.extract(buffer);
    const text = cleanText(result.text);
    // console.log("text", result.text);
    if (!text) throw new Error("No readable text was detected in the PDF.");
    return parseInvoice(
      text,
      result.ocrUsed ? "ocr" : "pdf-text",
      result.pages,
      result.ocrUsed,
      result.ocrConfidence,
      options.includeRawText
    );
  }
}

export const invoiceExtractionService = new InvoiceExtractionService();
