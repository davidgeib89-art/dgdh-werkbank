export const NEEDS_INPUT_MARKER = "[NEEDS INPUT]";

export interface NeedsInputLine {
  lineNumber: number;
  text: string;
}

export function extractNeedsInputLines(description: string | null | undefined): NeedsInputLine[] {
  if (!description) return [];

  return description
    .split(/\r?\n/)
    .map((line, index) => ({ lineNumber: index + 1, text: line }))
    .filter((line) => line.text.includes(NEEDS_INPUT_MARKER));
}

export function hasNeedsInput(description: string | null | undefined): boolean {
  return extractNeedsInputLines(description).length > 0;
}
