import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { readFileSync } from 'node:fs';
import { CONSTRUCTION_INDUCTION_DOCUMENTS } from '@/lib/construction-induction-documents';
import { inductionShareMessage, inductionShareUrl } from '@/lib/safety-induction-store';
import { INDUCTION_DECLARATION_POINTS } from '@/lib/induction-signed-pdf';

/** 1x1 PNG */
const TINY_PNG = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
);

describe('construction induction acknowledgment', () => {
  it('offers induction documents in multiple languages', () => {
    expect(CONSTRUCTION_INDUCTION_DOCUMENTS.length).toBeGreaterThanOrEqual(8);
    expect(CONSTRUCTION_INDUCTION_DOCUMENTS.some((document) => document.code === 'he')).toBe(true);
  });

  it('builds a query-param share URL embedded in the WhatsApp message body', () => {
    const token = '22222222-2222-2222-2222-222222222222';
    const url = inductionShareUrl(token);
    expect(url).toContain(`ci=${token}`);
    const message = inductionShareMessage({
      employeeName: 'ישראל',
      siteName: 'אטיאס חולון',
      languageLabel: 'עברית — עברית',
      url,
    });
    expect(message).toContain(url);
    expect(message).toContain('הוראות הבטיחות לעובד חדש');
    expect(message).toContain('אטיאס חולון');
  });

  it('includes the two declaration points from the induction form', () => {
    expect(INDUCTION_DECLARATION_POINTS).toHaveLength(2);
    expect(INDUCTION_DECLARATION_POINTS[0]).toContain('הסיכונים');
    expect(INDUCTION_DECLARATION_POINTS[1]).toContain('ציוד המגן');
  });

  it('stamps header + footer fields without adding a new page', async () => {
    const source = new Uint8Array(
      readFileSync('src/assets/training-documents/new-worker-construction/hebrew.pdf.txt'),
    );
    const original = await PDFDocument.load(source);
    expect(original.getPageCount()).toBe(2);

    const stamped = await PDFDocument.load(source);
    const [page1, page2] = stamped.getPages();
    const png = await stamped.embedPng(TINY_PNG);
    // Page 1 header tables
    page1.drawImage(png, { x: 318, y: 684, width: 155, height: 14 });
    page1.drawImage(png, { x: 72, y: 684, width: 135, height: 14 });
    // Page 2 acknowledgment table
    page2.drawImage(png, { x: 255, y: 74, width: 175, height: 15 });
    page2.drawImage(png, { x: 46, y: 58, width: 108, height: 48 });
    expect(stamped.getPageCount()).toBe(original.getPageCount());
  });
});
