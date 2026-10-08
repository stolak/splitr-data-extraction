export function cleanText(text: string): string {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[|]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function lines(text: string): string[] {
  return cleanText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}
