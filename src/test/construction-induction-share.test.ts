import { describe, expect, it } from 'vitest';
import { CONSTRUCTION_INDUCTION_DOCUMENTS } from '@/lib/construction-induction-documents';
import { inductionShareMessage, inductionShareUrl } from '@/lib/safety-induction-store';
import { INDUCTION_DECLARATION_POINTS } from '@/lib/induction-signed-pdf';

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
});
