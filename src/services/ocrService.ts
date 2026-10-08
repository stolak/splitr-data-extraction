import type { Worker } from "tesseract.js";
import { extractionConfig } from "./extractionConfig";

async function loadSharp() {
  const loaded = await import("sharp");
  return loaded.default;
}

export class OcrService {
  private workerPromise: Promise<Worker> | null = null;

  private getWorker(): Promise<Worker> {
    if (!this.workerPromise) {
      this.workerPromise = import("tesseract.js")
        .then(({ createWorker }) => createWorker(extractionConfig.ocrLanguage))
        .catch((error) => {
          this.workerPromise = null;
          throw error;
        });
    }
    return this.workerPromise;
  }

  async recognize(buffer: Buffer): Promise<{ text: string; confidence: number }> {
    const sharp = await loadSharp();
    const prepared = await sharp(buffer)
      .rotate()
      .resize({ width: 2200, withoutEnlargement: false })
      .grayscale()
      .normalize()
      .png()
      .toBuffer();

    const worker = await this.getWorker();
    const result = await worker.recognize(prepared);
    return {
      text: result.data.text,
      confidence: Number(result.data.confidence ?? 0) / 100,
    };
  }

  async terminate(): Promise<void> {
    if (!this.workerPromise) return;
    const worker = await this.workerPromise;
    await worker.terminate();
    this.workerPromise = null;
  }
}

export const ocrService = new OcrService();
