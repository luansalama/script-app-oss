/**
 * Count words in a string
 * Handles edge cases like multiple spaces, newlines, etc.
 */
export function countWords(text: string | null | undefined): number {
  if (!text) return 0;

  // Trim and split by whitespace
  const words = text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0);

  return words.length;
}

/**
 * Calculate target word count and acceptable range
 */
export function calculateTarget(
  durationSec: number,
  paceWordsPerSec: number,
  tolerance: number = 0.03
) {
  const target = Math.round(durationSec * paceWordsPerSec);
  return {
    target,
    min: Math.floor(target * (1 - tolerance)),
    max: Math.ceil(target * (1 + tolerance)),
    tolerance,
  };
}

/**
 * Calculate fit status and percentage deviation
 */
export function calculateFit(
  actualWords: number,
  targetWords: number,
  tolerance: number = 0.03
): { status: 'under' | 'ok' | 'over'; percent: number } {
  if (targetWords === 0) {
    return { status: 'ok', percent: 0 };
  }

  const percent = ((actualWords - targetWords) / targetWords) * 100;
  const tolerancePercent = tolerance * 100;

  let status: 'under' | 'ok' | 'over';
  if (percent < -tolerancePercent) {
    status = 'under';
  } else if (percent > tolerancePercent) {
    status = 'over';
  } else {
    status = 'ok';
  }

  return { status, percent: Math.round(percent * 10) / 10 };
}


