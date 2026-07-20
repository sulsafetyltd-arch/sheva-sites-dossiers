import { describe, expect, it } from 'vitest';
import {
  calculateKeepTogetherPadding,
  calculateSafePageSlices,
} from '@/lib/pdf-export';

describe('PDF section pagination', () => {
  it('moves a section to the next page when it would be cut', () => {
    expect(calculateKeepTogetherPadding(1050, 220, 1158)).toBe(109);
  });

  it('does not move sections that already fit or exceed a whole page', () => {
    expect(calculateKeepTogetherPadding(800, 200, 1158)).toBe(0);
    expect(calculateKeepTogetherPadding(1000, 1200, 1158)).toBe(0);
  });

  it('moves page boundaries before protected text and table rows', () => {
    const protectedRanges = [
      { top: 940, bottom: 1080 },
      { top: 1870, bottom: 2050 },
    ];
    const slices = calculateSafePageSlices(2600, 1000, protectedRanges);

    expect(slices[0]).toEqual({ start: 0, end: 938 });
    for (const slice of slices) {
      for (const range of protectedRanges) {
        expect(slice.end > range.top && slice.end < range.bottom).toBe(false);
      }
    }
    expect(slices.at(-1)?.end).toBe(2600);
  });

  it('keeps sensible page sizes when an element itself is taller than a page', () => {
    expect(calculateSafePageSlices(2200, 1000, [{ top: 100, bottom: 1800 }]))
      .toEqual([
        { start: 0, end: 1000 },
        { start: 1000, end: 2000 },
        { start: 2000, end: 2200 },
      ]);
  });
});
