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
    // Page 1 header tables — value cells measured from template borders
    page1.drawImage(png, { x: 298, y: 678, width: 140, height: 14 });
    page1.drawImage(png, { x: 42, y: 678, width: 88, height: 14 });
    page1.drawImage(png, { x: 300, y: 699, width: 90, height: 15 });
    // Page 2 acknowledgment table
    page2.drawImage(png, { x: 345, y: 72, width: 118, height: 14 });
    page2.drawImage(png, { x: 42, y: 50, width: 115, height: 44 });
    expect(stamped.getPageCount()).toBe(original.getPageCount());
  });
});
