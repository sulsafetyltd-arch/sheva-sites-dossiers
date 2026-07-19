import { describe, expect, it } from 'vitest';
import { parseEmployeeCsv } from '@/lib/safety-employee-csv';
import { defaultTrainingExpiry, trainingComplianceState } from '@/types/safety-employee';

describe('client employee training registry', () => {
  it('imports Hebrew employee CSV columns', () => {
    const employees = parseEmployeeCsv(
      'שם מלא,תעודת זהות,תפקיד,טלפון,דוא"ל\nישראל ישראלי,123456789,חשמלאי,0500000000,a@example.com',
    );
    expect(employees).toEqual([{
      fullName: 'ישראל ישראלי',
      idNumber: '123456789',
      jobTitle: 'חשמלאי',
      phone: '0500000000',
      email: 'a@example.com',
    }]);
  });

  it('imports a simple one-name-per-line file', () => {
    expect(parseEmployeeCsv('שם מלא\nדוד כהן\nשרה לוי').map((item) => item.fullName))
      .toEqual(['דוד כהן', 'שרה לוי']);
  });

  it('sets annual and height validity defaults', () => {
    expect(defaultTrainingExpiry('annual_safety', '2026-01-15')).toBe('2027-01-15');
    expect(defaultTrainingExpiry('work_at_height', '2026-01-15')).toBe('2028-01-15');
    expect(defaultTrainingExpiry('new_employee', '2026-01-15')).toBeUndefined();
  });

  it('flags expired, missing and missing-expiry training records', () => {
    const now = new Date('2026-07-19T12:00:00');
    expect(trainingComplianceState('annual_safety', true, '2026-07-18', now)).toBe('expired');
    expect(trainingComplianceState('work_at_height', false, undefined, now)).toBe('missing');
    expect(trainingComplianceState('annual_safety', true, undefined, now)).toBe('missing_expiry');
    expect(trainingComplianceState('new_employee', true, undefined, now)).toBe('valid');
    expect(trainingComplianceState('annual_safety', true, '2026-08-01', now)).toBe('soon');
  });
});
