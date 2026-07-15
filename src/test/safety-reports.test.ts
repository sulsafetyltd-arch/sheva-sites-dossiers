import { describe, expect, it, beforeEach } from 'vitest';
import { SAFETY_DOMAINS } from '@/data/safety-domains';
import {
  analyzeLocallyForTest,
  analyzeSafetyPhotos,
  createManualDetection,
} from '@/lib/safety-ai';
import { catalogDefectToDetection } from '@/lib/catalog-detection';
import {
  createSafetyReport,
  deleteSafetyReport,
  getAllSafetyReports,
  getSafetyReport,
  saveSafetyReport,
} from '@/lib/safety-report-store';

describe('safety domains catalog', () => {
  it('covers construction, infrastructure, factory and more', () => {
    const ids = SAFETY_DOMAINS.map((d) => d.id);
    expect(ids).toContain('construction');
    expect(ids).toContain('infrastructure');
    expect(ids).toContain('factory');
    expect(ids).toContain('office');
    expect(ids).toContain('warehouse');
  });

  it('keeps each domain defect list separated', () => {
    for (const domain of SAFETY_DOMAINS) {
      expect(domain.defects.length).toBeGreaterThan(0);
      if (domain.id !== 'general') {
        expect(domain.defects.every((d) => !d.id.startsWith('g-'))).toBe(true);
      }
    }

    const infra = SAFETY_DOMAINS.find((d) => d.id === 'infrastructure')!;
    expect(infra.defects.some((d) => d.id === 'i-trench')).toBe(true);
    expect(infra.defects.some((d) => d.id.startsWith('c-'))).toBe(false);

    const construction = SAFETY_DOMAINS.find((d) => d.id === 'construction')!;
    expect(construction.defects.some((d) => d.id.startsWith('i-'))).toBe(false);
  });
});

describe('catalog picker mapping', () => {
  it('converts domain catalog items into accepted detections', () => {
    const trench = SAFETY_DOMAINS.find((d) => d.id === 'infrastructure')!.defects.find(
      (d) => d.id === 'i-trench',
    )!;
    const detection = catalogDefectToDetection(trench);
    expect(detection.source).toBe('catalog');
    expect(detection.catalogId).toBe('i-trench');
    expect(detection.status).toBe('accepted');
    expect(detection.title).toContain('חפירה');
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

    expect(result.detections.length).toBeGreaterThanOrEqual(2);
    expect(result.mode).toBe('local-ai');
    expect(result.detections.every((d) => d.source === 'ai')).toBe(true);
    expect(result.detections.every((d) => d.confidence > 0 && d.confidence <= 1)).toBe(true);
  });

  it('ranks infrastructure trench defects when notes mention excavation', async () => {
    const result = await analyzeLocallyForTest({
      domain: 'infrastructure',
      siteName: 'עבודות תשתיות ברחוב הרצל',
      notes: 'חפירה פתוחה ליד הכביש בלי גידור, שוחה בלי מכסה',
      photos: [
        {
          id: '1',
          url: 'data:image/jpeg;base64,xx',
          caption: 'תעלת תשתיות פתוחה',
          timestamp: new Date().toISOString(),
        },
      ],
    });

    expect(result.detections.length).toBeGreaterThanOrEqual(2);
    const titles = result.detections.map((d) => d.title).join(' ');
    expect(
      titles.includes('חפירה') ||
        titles.includes('שוחה') ||
        titles.includes('כבלים') ||
        result.detections.some((d) => d.category.includes('חפיר') || d.category.includes('שוח')),
    ).toBe(true);
    expect(result.detections[0].confidence).toBeGreaterThanOrEqual(0.45);
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
      siteName: 'קו ביוב בדיקה',
      domain: 'infrastructure',
    });
    expect(report.id).toBeTruthy();
    expect(report.domain).toBe('infrastructure');

    report.detections.push(
      createManualDetection({ title: 'חפירה ללא גידור', severity: 'critical' }),
    );
    report.status = 'ready';
    await saveSafetyReport(report);

    const list = await getAllSafetyReports();
    expect(list).toHaveLength(1);
    expect(list[0].criticalCount).toBe(1);

    const loaded = await getSafetyReport(report.id);
    expect(loaded?.detections[0].title).toBe('חפירה ללא גידור');

    await deleteSafetyReport(report.id);
    expect(await getAllSafetyReports()).toHaveLength(0);
  });
});
