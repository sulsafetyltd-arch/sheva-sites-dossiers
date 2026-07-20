import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  VISION_HAZARD_CATEGORIES,
  getVisionApiKeys,
  hasVisionModelConfigured,
  saveVisionApiKeys,
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
