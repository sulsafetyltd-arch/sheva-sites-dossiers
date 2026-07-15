import { describe, expect, it, beforeEach } from 'vitest';
import { getDefectCatalog, SAFETY_DOMAINS } from '@/data/safety-domains';
import { analyzeSafetyPhotos, createManualDetection } from '@/lib/safety-ai';
import {
  createSafetyReport,
  deleteSafetyReport,
  getAllSafetyReports,
  getSafetyReport,
  saveSafetyReport,
} from '@/lib/safety-report-store';

describe('safety domains catalog', () => {
  it('covers construction, factory, office and more', () => {
    const ids = SAFETY_DOMAINS.map((d) => d.id);
    expect(ids).toContain('construction');
    expect(ids).toContain('factory');
    expect(ids).toContain('office');
    expect(ids).toContain('warehouse');
  });

  it('returns domain-specific defects plus general ones', () => {
    const factory = getDefectCatalog('factory');
    expect(factory.some((d) => d.id.startsWith('f-'))).toBe(true);
    expect(factory.some((d) => d.id.startsWith('g-'))).toBe(true);
  });
});

describe('safety AI analyzer', () => {
  it('produces findings for a domain with photos', async () => {
    const result = await analyzeSafetyPhotos({
      domain: 'construction',
      siteName: 'אתר פיגום תל אביב',
      notes: 'חסר כובע מגן ליד פיגום',
      photos: [
        {
          id: '1',
          url: 'data:image/jpeg;base64,xx',
          caption: 'פיגום ללא מעקה',
          timestamp: new Date().toISOString(),
        },
      ],
    });

    expect(result.detections.length).toBeGreaterThanOrEqual(3);
    expect(result.mode).toBe('local-ai');
    expect(result.detections.every((d) => d.source === 'ai')).toBe(true);
    expect(result.detections.every((d) => d.confidence > 0 && d.confidence <= 1)).toBe(true);
  });

  it('creates manual detections as accepted', () => {
    const d = createManualDetection({ title: 'ליקוי בדיקה', severity: 'high' });
    expect(d.source).toBe('manual');
    expect(d.confidence).toBe(1);
  });
});

describe('safety report store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates, saves and lists reports', async () => {
    const report = await createSafetyReport({
      siteName: 'מפעל בדיקה',
      domain: 'factory',
    });
    expect(report.id).toBeTruthy();

    report.detections.push(
      createManualDetection({ title: 'מכונה ללא מגן', severity: 'critical' }),
    );
    report.status = 'ready';
    await saveSafetyReport(report);

    const list = await getAllSafetyReports();
    expect(list).toHaveLength(1);
    expect(list[0].criticalCount).toBe(1);
    expect(list[0].siteName).toBe('מפעל בדיקה');

    const loaded = await getSafetyReport(report.id);
    expect(loaded?.detections[0].title).toBe('מכונה ללא מגן');

    await deleteSafetyReport(report.id);
    expect(await getAllSafetyReports()).toHaveLength(0);
  });
});
