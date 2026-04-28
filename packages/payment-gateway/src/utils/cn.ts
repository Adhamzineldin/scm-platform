/** Minimal className joiner — no external deps required. */
export function cn(...inputs: (string | false | null | undefined | 0)[]): string {
  return inputs.filter(Boolean).join(' ');
}
