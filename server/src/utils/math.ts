export function randInt({ min = 0, max = 100 }): number {
  if (min > max) {
    throw new Error("The 'min' value cannot be greater than the 'max' value.");
  }

  return Math.floor(Math.random() * (max - min) + min);
}

export function randCode(length: number = 6): string {
  return Array.from({ length }, () => randInt({ max: 9 })).join("");
}

export function rangeInt({ min = 0, max = 100 }: { min?: number; max?: number }): number[] {
  if (min > max) {
    throw new Error("The 'min' value cannot be greater than the 'max' value.");
  }

  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}
