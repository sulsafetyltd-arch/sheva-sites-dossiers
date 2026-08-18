import type { CalendarItem } from '@/types/real-estate';

function icsEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function icsDate(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '');
}

export function buildIcs(items: CalendarItem[]): string {
  const stamp = `${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
  const events = items
    .filter((item) => /^\d{4}-\d{2}-\d{2}/.test(item.date))
    .map((item) => {
      const summary = `${item.title} — ${item.dealTitle}`;
      const description = `תיק ${item.fileNumber}${item.amount != null ? ` · סכום ${item.amount.toLocaleString('he-IL')} ₪` : ''}`;
      return [
        'BEGIN:VEVENT',
        `UID:${item.id}@solo-nadlan`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${icsDate(item.date)}`,
        `SUMMARY:${icsEscape(summary)}`,
        `DESCRIPTION:${icsEscape(description)}`,
        'BEGIN:VALARM',
        'TRIGGER:-P1D',
        'ACTION:DISPLAY',
        `DESCRIPTION:${icsEscape(summary)}`,
        'END:VALARM',
        'END:VEVENT',
      ].join('\r\n');
    });
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Solo Nadlan//He//',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(items: CalendarItem[], filename = 'solo-nadlan-calendar.ics'): void {
  const blob = new Blob([buildIcs(items)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Builds a wa.me link with a prefilled Hebrew reminder. Phone may be 05X or +972 format. */
export function whatsappReminderLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('972') ? digits : digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}
