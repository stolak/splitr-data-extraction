function positiveNumber(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const extractionConfig = {
  get ocrLanguage(): string {
    return process.env.OCR_LANGUAGE?.trim() || "eng";
  },
  get maxPdfPages(): number {
    return positiveNumber("MAX_PDF_PAGES", 5);
  },
  get ocrMinTextChars(): number {
    return positiveNumber("OCR_MIN_TEXT_CHARS", 40);
  },
  get ocrScale(): number {
    return positiveNumber("OCR_SCALE", 2);
  },
  get maxUploadBytes(): number {
    return positiveNumber("MAX_UPLOAD_BYTES", 10 * 1024 * 1024);
  },
};
