import type { SupportedFileType } from "../types/invoiceExtraction";

function hasPrefix(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((value, index) => buffer[index] === value);
}

export async function detectFileType(buffer: Buffer): Promise<SupportedFileType | null> {
  // PDF: %PDF
  if (hasPrefix(buffer, [0x25, 0x50, 0x44, 0x46])) return "pdf";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  // JPEG: FF D8 FF
  if (hasPrefix(buffer, [0xff, 0xd8, 0xff])) return "jpeg";
  return null;
}
