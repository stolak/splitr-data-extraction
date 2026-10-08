import { extractionConfig } from "./extractionConfig";
import { ocrService } from "./ocrService";

export interface PdfExtraction {
  text: string;
  pages: number;
  ocrUsed: boolean;
  ocrConfidence: number;
}

export class PdfExtractionService {
  async extract(buffer: Buffer): Promise<PdfExtraction> {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });

    try {
      const info = await parser.getInfo({ parsePageInfo: true });
      const pages = Math.min(info.total || 1, extractionConfig.maxPdfPages);
      const textResult = await parser.getText({
        partial: Array.from({ length: pages }, (_, index) => index + 1),
      });

      const text = textResult.text?.trim() ?? "";
      if (text.replace(/\s/g, "").length >= extractionConfig.ocrMinTextChars) {
        return { text, pages, ocrUsed: false, ocrConfidence: 1 };
      }

      const screenshots = await parser.getScreenshot({
        scale: extractionConfig.ocrScale,
        first: pages,
        imageBuffer: true,
        imageDataUrl: false,
      });

      const ocrTexts: string[] = [];
      const confidences: number[] = [];
      for (const page of screenshots.pages) {
        const result = await ocrService.recognize(Buffer.from(page.data));
        ocrTexts.push(result.text);
        confidences.push(result.confidence);
      }

      return {
        text: ocrTexts.join("\n"),
        pages,
        ocrUsed: true,
        ocrConfidence: confidences.length
          ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
          : 0,
      };
    } finally {
      await parser.destroy();
    }
  }
}

export const pdfExtractionService = new PdfExtractionService();
