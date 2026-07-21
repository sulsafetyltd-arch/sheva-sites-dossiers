import { describe, expect, it } from 'vitest';
import { mapSafetyReportRow } from '@/lib/safety-audit-store';
import {
  CORRECTIVE_ACTION_SUGGESTIONS,
  getChecklistTopics,
  reportTypeLabel,
} from '@/types/safety-audit';

describe('safety report database mapping', () => {
  it('preserves issuer stamp, signature and professional details', () => {
    const report = mapSafetyReportRow({
      id: 'report-1',
      client_id: 'client-1',
      report_type: 'construction',
      report_number: 'BN-2026-001',
      date: '2026-07-17',
      status: 'draft',
      auditor: 'ישראל ישראלי',
      auditor_role: 'ממונה בטיחות',
      auditor_phone: '050-0000000',
      auditor_signature_url: 'data:image/png;base64,signature',
      auditor_stamp_url: 'data:image/png;base64,stamp',
      checklist: {},
      created_at: '2026-07-17T00:00:00Z',
      updated_at: '2026-07-17T00:00:00Z',
    });

    expect(report.reportType).toBe('construction');
    expect(report.auditorSignatureUrl).toContain('signature');
    expect(report.auditorStampUrl).toContain('stamp');
    expect(report.auditorPhone).toBe('050-0000000');
  });

  it('normalizes invalid enum values to safe defaults', () => {
    const report = mapSafetyReportRow({
      id: 'report-2',
      client_id: 'client-1',
      report_type: 'unexpected',
      date: '2026-07-17',
      status: 'unexpected',
      risk_level: 'unexpected',
      created_at: '2026-07-17T00:00:00Z',
      updated_at: '2026-07-17T00:00:00Z',
    });

    expect(report.reportType).toBe('workplace');
    expect(report.status).toBe('draft');
    expect(report.riskLevel).toBeUndefined();
  });

  it('supports infrastructure reports and their supplied checklist', () => {
    const report = mapSafetyReportRow({
      id: 'report-3',
      client_id: 'client-1',
      report_type: 'infrastructure',
      date: '2026-07-17',
      status: 'draft',
      created_at: '2026-07-17T00:00:00Z',
      updated_at: '2026-07-17T00:00:00Z',
    });

    expect(report.reportType).toBe('infrastructure');
    expect(reportTypeLabel(report.reportType)).toBe('אתר תשתיות');
    expect(getChecklistTopics(report.reportType)).toHaveLength(48);
  });

  it('offers editable corrective action suggestions for common hazards', () => {
    expect(CORRECTIVE_ACTION_SUGGESTIONS.length).toBeGreaterThanOrEqual(10);
    expect(CORRECTIVE_ACTION_SUGGESTIONS.some((action) => action.includes('בודק מוסמך'))).toBe(true);
    expect(CORRECTIVE_ACTION_SUGGESTIONS.some((action) => action.includes('ציוד מגן אישי'))).toBe(true);
  });

  it('supports the dedicated Israel Railways report format', () => {
    const report = mapSafetyReportRow({
      id: 'report-rail',
      client_id: 'client-1',
      report_type: 'railway',
      date: '2026-07-19',
      status: 'draft',
      domain_details: {
        railwayKmFrom: '12+500',
        railwayKmTo: '13+200',
        participants: [{ name: 'ישראל ישראלי', role: 'מנהל עבודה' }],
      },
      created_at: '2026-07-19T00:00:00Z',
      updated_at: '2026-07-19T00:00:00Z',
    });

    expect(report.reportType).toBe('railway');
    expect(reportTypeLabel(report.reportType)).toBe('אתרי רכבת ישראל');
    expect(getChecklistTopics(report.reportType)).toHaveLength(30);
    expect(report.domainDetails?.railwayKmFrom).toBe('12+500');
  });

  it('supports annual building safety surveys', () => {
    const report = mapSafetyReportRow({
      id: 'report-building',
      client_id: 'client-1',
      report_type: 'building_survey',
      date: '2026-07-19',
      status: 'draft',
      domain_details: {
        approvalDecision: 'approved',
        fireApprovalDate: '2026-06-01',
        structuralApprovalDate: '2026-06-02',
        electricalApprovalDate: '2026-06-03',
        approvalValidUntil: '2027-07-19',
      },
      created_at: '2026-07-19T00:00:00Z',
      updated_at: '2026-07-19T00:00:00Z',
    });

    expect(report.reportType).toBe('building_survey');
    expect(reportTypeLabel(report.reportType)).toBe('סקר בטיחות למבנה');
    expect(getChecklistTopics(report.reportType)).toHaveLength(23);
    expect(report.domainDetails?.approvalDecision).toBe('approved');
  });

  it('supports Ministry of Education institution safety audits', () => {
    const report = mapSafetyReportRow({
      id: 'report-education',
      client_id: 'client-1',
      report_type: 'education_institution',
      date: '2026-07-21',
      status: 'draft',
      domain_details: {
        ownership: 'מועצה אזורית שדות נגב',
        institutionSymbol: '707240',
        studentsCount: '28',
        principalName: 'חגית כהן',
      },
      created_at: '2026-07-21T00:00:00Z',
      updated_at: '2026-07-21T00:00:00Z',
    });

    expect(report.reportType).toBe('education_institution');
    expect(reportTypeLabel(report.reportType)).toBe('מבדק בטיחות במוסדות חינוך');
    expect(getChecklistTopics(report.reportType)).toHaveLength(40);
    expect(report.domainDetails?.institutionSymbol).toBe('707240');
  });
});
