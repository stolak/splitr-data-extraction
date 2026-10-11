import type { ExtractionOptions } from "../types/invoiceExtraction";
import { detectFileType } from "../utils/fileSignature";
import { cleanText } from "../utils/extractionText";
import { ocrService } from "./ocrService";
import { openaiTextExtractionService, type TextExtractionResult } from "./openaiTextExtractionService";

export class InvoiceExtractionService {
  async extract(buffer: Buffer, _options: ExtractionOptions = {}): Promise<TextExtractionResult> {
    const type = await detectFileType(buffer);
    if (type !== "png" && type !== "jpeg") {
      throw new Error("Unsupported or invalid file. Only PNG and JPEG images are accepted.");
    }

    const result = await ocrService.recognize(buffer);
    const text = cleanText(result.text);
    if (!text) throw new Error("No readable text was detected in the image.");
    return openaiTextExtractionService.extract(text);
  }
}

export const invoiceExtractionService = new InvoiceExtractionService();
