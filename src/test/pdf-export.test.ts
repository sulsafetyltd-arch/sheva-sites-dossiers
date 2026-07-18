import { describe, expect, it } from 'vitest';
import { calculateKeepTogetherPadding } from '@/lib/pdf-export';

describe('PDF section pagination', () => {
  it('moves a section to the next page when it would be cut', () => {
    expect(calculateKeepTogetherPadding(1050, 220, 1158)).toBe(109);
  });

  it('does not move sections that already fit or exceed a whole page', () => {
    expect(calculateKeepTogetherPadding(800, 200, 1158)).toBe(0);
    expect(calculateKeepTogetherPadding(1000, 1200, 1158)).toBe(0);
  });
});
