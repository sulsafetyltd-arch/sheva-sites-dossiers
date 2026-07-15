import { describe, expect, it, beforeEach } from 'vitest';
import { analyzeLocallyForTest, analyzeSafetyPhotos } from '@/lib/safety-ai';
import { slimPhotosForStorage } from '@/lib/photo-cache';

const RED_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('AI photo analysis reliability', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('always returns findings for photo-only analysis within a few seconds', async () => {
    const start = Date.now();
    const result = await analyzeSafetyPhotos({
      domain: 'infrastructure',
      siteName: 'עבודות תשתיות',
      notes: '',
      photos: [
        {
          id: 'p1',
          url: RED_PNG,
          caption: '',
          timestamp: new Date().toISOString(),
        },
      ],
    });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(8000);
    expect(result.detections.length).toBeGreaterThanOrEqual(3);
    expect(result.mode).toBe('local-ai');
    expect(result.detections.every((d) => d.title && d.severity)).toBe(true);
  }, 12000);

  it('ranks keywords for trench notes', async () => {
    const result = await analyzeLocallyForTest({
      domain: 'infrastructure',
      notes: 'חפירה פתוחה בלי גידור',
      photos: [
        { id: '1', url: RED_PNG, caption: 'תעלה', timestamp: new Date().toISOString() },
      ],
    });
    expect(result.detections.length).toBeGreaterThanOrEqual(3);
    expect(result.detections[0].confidence).toBeGreaterThan(0.4);
  });

  it('strips heavy data urls before storage', () => {
    const slim = slimPhotosForStorage([
      {
        id: 'x',
        url: RED_PNG,
        previewUrl: RED_PNG,
        caption: '',
        timestamp: new Date().toISOString(),
      },
    ]);
    expect(slim[0].previewUrl).toBeUndefined();
    expect(slim[0].url.startsWith('local://')).toBe(true);
  });
});
