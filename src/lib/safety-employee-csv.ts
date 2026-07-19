import type { SafetyClientEmployee } from '@/types/safety-employee';

type EmployeeImport = Pick<SafetyClientEmployee, 'fullName'> & Partial<SafetyClientEmployee>;

function splitRow(row: string, delimiter: string): string[] {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    if (char === '"') {
      if (quoted && row[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      values.push(value.trim());
      value = '';
    } else {
      value += char;
    }
  }
  values.push(value.trim());
  return values;
}

const normalize = (value: string) =>
  value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/["׳״']/g, '');

export function parseEmployeeCsv(text: string): EmployeeImport[] {
  const rows = text.split(/\r?\n/).map((row) => row.trim()).filter(Boolean);
  if (rows.length === 0) return [];
  const delimiter = ['\t', ';', ','].sort(
    (a, b) => rows[0].split(b).length - rows[0].split(a).length,
  )[0];
  const first = splitRow(rows[0], delimiter);
  if (first.length === 1) {
    const start = ['שם', 'שם מלא', 'name', 'full name'].includes(normalize(first[0])) ? 1 : 0;
    return rows.slice(start).map((row) => ({ fullName: splitRow(row, delimiter)[0] })).filter((item) => item.fullName);
  }

  const aliases: Record<string, string[]> = {
    fullName: ['שם', 'שם מלא', 'שם העובד', 'name', 'full name'],
    idNumber: ['תז', 'תעודת זהות', 'מספר זהות', 'id', 'id number'],
    jobTitle: ['תפקיד', 'מקצוע', 'role', 'job title'],
    phone: ['טלפון', 'נייד', 'phone', 'mobile'],
    email: ['דואל', 'אימייל', 'email'],
  };
  const headers = first.map(normalize);
  const indexOf = (field: keyof typeof aliases) =>
    headers.findIndex((header) => aliases[field].includes(header));
  const indexes = {
    fullName: indexOf('fullName'),
    idNumber: indexOf('idNumber'),
    jobTitle: indexOf('jobTitle'),
    phone: indexOf('phone'),
    email: indexOf('email'),
  };
  if (indexes.fullName < 0) throw new Error('בקובץ חסרה עמודת „שם מלא”');

  return rows.slice(1).map((row) => {
    const values = splitRow(row, delimiter);
    const get = (index: number) => index >= 0 ? values[index]?.trim() || undefined : undefined;
    return {
      fullName: get(indexes.fullName) || '',
      idNumber: get(indexes.idNumber),
      jobTitle: get(indexes.jobTitle),
      phone: get(indexes.phone),
      email: get(indexes.email),
    };
  }).filter((employee) => employee.fullName);
}
