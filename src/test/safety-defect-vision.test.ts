import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  VISION_HAZARD_CATEGORIES,
  formatVisionApiError,
  getVisionApiKeys,
  hasVisionModelConfigured,
  looksLikeGeminiApiKey,
  saveVisionApiKeys,
  sanitizeVisionApiKey,
  suggestionFromHazardCategory,
  visionSourceLabel,
} from '@/lib/safety-defect-vision';
import { getChecklistTopics } from '@/types/safety-audit';

describe('safety defect vision assist', () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it('stores and reads vision API keys from localStorage', () => {
    expect(hasVisionModelConfigured()).toBe(false);
    saveVisionApiKeys({ gemini: 'gem-test', openai: 'oa-test' });
    expect(hasVisionModelConfigured()).toBe(true);
    expect(getVisionApiKeys()).toEqual({ gemini: 'gem-test', openai: 'oa-test' });
    saveVisionApiKeys({ gemini: '', openai: '' });
    expect(hasVisionModelConfigured()).toBe(false);
  });

  it('sanitizes pasted API keys and explains invalid Gemini keys', () => {
    expect(sanitizeVisionApiKey('  "Bearer AIzaSyDummyKeyValue1234567890"  ')).toBe(
      'AIzaSyDummyKeyValue1234567890',
    );
    expect(looksLikeGeminiApiKey('AIzaSyDummyKeyValue1234567890')).toBe(true);
    expect(looksLikeGeminiApiKey('not-a-key')).toBe(false);
    expect(
      formatVisionApiError(
        'gemini',
        400,
        '{"error":{"message":"API key not valid. Please pass a valid API key."}}',
      ),
    ).toContain('מפתח Gemini לא תקין');
  });

  it('builds a local assistive suggestion from a hazard category', () => {
    const topics = getChecklistTopics('construction');
    const category = VISION_HAZARD_CATEGORIES.find((entry) => entry.id === 'ppe');
    expect(category).toBeTruthy();
    const suggestion = suggestionFromHazardCategory(category!, topics);
    expect(suggestion.source).toBe('local_assist');
    expect(suggestion.severity).toBe('high');
    expect(suggestion.description).toContain('ציוד מגן');
    expect(suggestion.correctiveAction.length).toBeGreaterThan(10);
    expect(visionSourceLabel(suggestion.source)).toContain('מקומי');
  });

  it('covers common site hazard categories for offline assist', () => {
    expect(VISION_HAZARD_CATEGORIES.length).toBeGreaterThanOrEqual(8);
    expect(VISION_HAZARD_CATEGORIES.some((entry) => entry.id === 'electrical')).toBe(true);
    expect(VISION_HAZARD_CATEGORIES.some((entry) => entry.id === 'work_at_height')).toBe(true);
  });
});
