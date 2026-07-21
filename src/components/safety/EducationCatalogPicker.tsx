import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { RailwayReportDetails, SafetyAuditDefect } from '@/types/safety-audit';
import {
  EDUCATION_APPROVALS,
  EDUCATION_CHAPTER_TITLES,
  EDUCATION_KIND_DEFAULT_APPROVALS,
  EDUCATION_KIND_DEFAULT_CHAPTERS,
  EDUCATION_KIND_LABELS,
  EDUCATION_SECTIONS,
  educationSectionsForKind,
  type EducationInstitutionKind,
} from '@/data/education-moe-catalog';

type Props = {
  details: RailwayReportDetails;
  defects: SafetyAuditDefect[];
  onDetailsChange: (patch: Partial<RailwayReportDetails>) => void;
  onAddFindings: (sectionKeys: string[]) => Promise<void>;
};

export default function EducationCatalogPicker({
  details,
  defects,
  onDetailsChange,
  onAddFindings,
}: Props) {
  const kind = (details.institutionKind || 'other') as EducationInstitutionKind;
  const [tab, setTab] = useState<'approvals' | 'sections'>('approvals');
  const [query, setQuery] = useState('');
  const [chapterFilter, setChapterFilter] = useState<number | 'recommended' | 'all'>('recommended');
  const [pendingSections, setPendingSections] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const selectedApprovals = new Set(details.selectedApprovalKeys ?? []);
  const approvalStatuses = details.approvalStatuses ?? {};
  const selectedSections = new Set(details.selectedSectionKeys ?? []);

  /** Full MoE pool — kind only shapes the recommended defaults, not a hard lockout. */
  const sections = useMemo(() => EDUCATION_SECTIONS, []);
  const kindSections = useMemo(() => educationSectionsForKind(kind), [kind]);
  const recommendedChapters = useMemo(
    () => EDUCATION_KIND_DEFAULT_CHAPTERS[kind] ?? [],
    [kind],
  );

  const visibleSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = chapterFilter === 'recommended' ? kindSections : sections;
    return pool.filter((section) => {
      if (chapterFilter === 'recommended' && !recommendedChapters.includes(section.chapter)) {
        return false;
      }
      if (typeof chapterFilter === 'number' && section.chapter !== chapterFilter) {
        return false;
      }
      if (!q) return true;
      return `${section.sectionCode} ${section.title} ${section.chapterTitle}`.toLowerCase().includes(q);
    });
  }, [sections, kindSections, chapterFilter, recommendedChapters, query]);

  const chaptersInView = useMemo(() => {
    const source = chapterFilter === 'recommended'
      ? recommendedChapters
      : Object.keys(EDUCATION_CHAPTER_TITLES).map(Number).sort((a, b) => a - b);
    return source;
  }, [chapterFilter, recommendedChapters]);

  const toggleApproval = (key: string) => {
    const next = new Set(selectedApprovals);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onDetailsChange({ selectedApprovalKeys: Array.from(next) });
  };

  const applySuggestedApprovals = () => {
    onDetailsChange({
      selectedApprovalKeys: [...(EDUCATION_KIND_DEFAULT_APPROVALS[kind] ?? [])],
    });
  };

  const setApprovalStatus = (
    key: string,
    status: 'presented' | 'missing' | 'na',
  ) => {
    onDetailsChange({
      approvalStatuses: {
        ...approvalStatuses,
        [key]: { ...(approvalStatuses[key] ?? {}), status },
      },
    });
  };

  const togglePendingSection = (key: string) => {
    setPendingSections((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const addSelectedFindings = async () => {
    const keys = Array.from(pendingSections);
    if (keys.length === 0) return;
    setAdding(true);
    try {
      const merged = new Set([...selectedSections, ...keys]);
      onDetailsChange({ selectedSectionKeys: Array.from(merged) });
      await onAddFindings(keys);
      setPendingSections(new Set());
      setTab('sections');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">מאגר הרשימה המנחה — משרד החינוך</h2>
        <p className="text-sm text-slate-500 mt-1">
          סוג מוסד: <span className="font-medium text-slate-700">{EDUCATION_KIND_LABELS[kind]}</span>
          {' · '}בוחרים רק אישורים וסעיפים רלוונטיים — אין צורך לעבור על כל הפרקים.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant={tab === 'approvals' ? 'default' : 'outline'} onClick={() => setTab('approvals')}>
          פרק 1 — אישורים ({selectedApprovals.size}/20)
        </Button>
        <Button type="button" variant={tab === 'sections' ? 'default' : 'outline'} onClick={() => setTab('sections')}>
          סעיפי בדיקה ({selectedSections.size} נבחרו)
        </Button>
      </div>

      {tab === 'approvals' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={applySuggestedApprovals}>
              סמן מומלצים ל{EDUCATION_KIND_LABELS[kind]}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onDetailsChange({ selectedApprovalKeys: [] })}
            >
              נקה בחירה
            </Button>
          </div>
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {EDUCATION_APPROVALS.map((item) => {
              const checked = selectedApprovals.has(item.key);
              const status = approvalStatuses[item.key]?.status;
              return (
                <div
                  key={item.key}
                  className={`rounded-xl border bg-white p-3 space-y-2 shadow-sm ${checked ? 'border-rose-300' : ''}`}
                >
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={checked}
                      onChange={() => toggleApproval(item.key)}
                    />
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500">אישור {item.code}</div>
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {item.inspector} · {item.frequency}
                      </div>
                    </div>
                  </label>
                  {checked && (
                    <div className="flex flex-wrap gap-2 pr-7">
                      {([
                        ['presented', 'הוצג'],
                        ['missing', 'לא הוצג'],
                        ['na', 'לא רלוונטי'],
                      ] as const).map(([value, label]) => (
                        <Button
                          key={value}
                          type="button"
                          size="sm"
                          variant={status === value ? 'default' : 'outline'}
                          onClick={() => setApprovalStatus(item.key, value)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'sections' && (
        <div className="space-y-3">
          <Input
            dir="rtl"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="חיפוש לפי מספר סעיף או תוכן…"
          />
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <Button
              type="button"
              size="sm"
              variant={chapterFilter === 'recommended' ? 'default' : 'outline'}
              className="shrink-0"
              onClick={() => setChapterFilter('recommended')}
            >
              פרקים מומלצים
            </Button>
            <Button
              type="button"
              size="sm"
              variant={chapterFilter === 'all' ? 'default' : 'outline'}
              className="shrink-0"
              onClick={() => setChapterFilter('all')}
            >
              כל הפרקים
            </Button>
            {chaptersInView.map((chapter) => (
              <Button
                key={chapter}
                type="button"
                size="sm"
                variant={chapterFilter === chapter ? 'default' : 'outline'}
                className="shrink-0"
                onClick={() => setChapterFilter(chapter)}
              >
                {chapter}. {EDUCATION_CHAPTER_TITLES[chapter]}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-500">
              {visibleSections.length} סעיפים בתצוגה · {pendingSections.size} מסומנים להוספה · {defects.length} ממצאים בדוח
            </div>
            <Button
              type="button"
              size="sm"
              disabled={pendingSections.size === 0 || adding}
              onClick={() => void addSelectedFindings()}
            >
              {adding ? 'מוסיף…' : `הוסף ממצאים לסעיפים שנבחרו (${pendingSections.size})`}
            </Button>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {visibleSections.map((section) => {
              const checked = pendingSections.has(section.key) || selectedSections.has(section.key);
              const linked = defects.filter((d) => d.checklistTopicKey === section.key).length;
              return (
                <label
                  key={section.key}
                  className={`rounded-xl border bg-white p-3 flex items-start gap-3 cursor-pointer shadow-sm ${
                    pendingSections.has(section.key) ? 'border-rose-400' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={pendingSections.has(section.key)}
                    onChange={() => togglePendingSection(section.key)}
                  />
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500">
                      פרק {section.chapter} — {section.chapterTitle}
                      {checked && linked === 0 ? ' · נבחר' : ''}
                      {linked > 0 ? ` · ${linked} ממצאים` : ''}
                    </div>
                    <div className="font-medium text-sm">
                      <span className="text-rose-800">{section.sectionCode}</span>
                      {' — '}
                      {section.title}
                    </div>
                  </div>
                </label>
              );
            })}
            {visibleSections.length === 0 && (
              <div className="rounded-xl border border-dashed bg-white p-6 text-center text-sm text-slate-500">
                לא נמצאו סעיפים — נסו פרק אחר או חיפוש רחב יותר
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
