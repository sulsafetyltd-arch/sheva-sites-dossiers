import {
  TRAINING_META,
  TRAINING_MODULES,
  TRAINING_STAGES,
  modulesForStage,
} from '@/data/training-curriculum';
import { exportToPdf } from '@/lib/pdf-export';
import { isModuleComplete, readTrainingProgress } from '@/lib/training-store';
import { overallStats, stageStats, weeksSinceStart } from '@/lib/training-utils';
import type { ModuleProgress, TrainingProgress } from '@/types/training';

const emptyModule = (): ModuleProgress => ({
  layers: {},
  deliverableNotes: '',
  readIds: [],
  deliverableAnswers: {},
  quizAnswers: {},
});

export type CertificateSummary = {
  overallPercent: number;
  completed: number;
  total: number;
  weeks: number;
  fullyComplete: boolean;
  stages: Array<{ code: string; title: string; completed: number; total: number; percent: number }>;
  completedModules: Array<{ code: string; title: string }>;
  issuedAt: string;
};

export function buildCertificateSummary(
  progress: TrainingProgress = readTrainingProgress(),
): CertificateSummary {
  const overall = overallStats(progress);
  const stages = TRAINING_STAGES.map((stage) => {
    const stats = stageStats(stage.id, progress);
    return {
      code: stage.code,
      title: stage.title,
      completed: stats.completed,
      total: stats.total,
      percent: stats.percent,
    };
  });
  const completedModules = TRAINING_MODULES.filter((m) =>
    isModuleComplete(progress.modules[m.id] ?? emptyModule()),
  ).map((m) => ({ code: m.code, title: m.title }));

  return {
    overallPercent: overall.percent,
    completed: overall.completed,
    total: overall.total,
    weeks: weeksSinceStart(progress) + 1,
    fullyComplete: overall.completed === overall.total && overall.total > 0,
    stages,
    completedModules,
    issuedAt: new Date().toLocaleDateString('he-IL'),
  };
}

function buildCertificateElement(summary: CertificateSummary): HTMLElement {
  const root = document.createElement('div');
  root.setAttribute('dir', 'rtl');
  root.style.cssText =
    'width:720px;padding:36px 40px;background:#fff;color:#122;font-family:Heebo,Arial,sans-serif;box-sizing:border-box;';

  const title = summary.fullyComplete ? 'תעודת סיום הכשרה' : 'סיכום התקדמות בהכשרה';
  const subtitle = summary.fullyComplete
    ? 'הושלמו כל מודולי תכנית ההכשרה באפליקציה'
    : 'דוח התקדמות אישי — מודולים שהושלמו בתוך האפליקציה';

  const stageRows = summary.stages
    .map(
      (s) =>
        `<tr>
          <td style="padding:8px 6px;border-bottom:1px solid #e6e8ec;">שלב ${s.code} · ${s.title}</td>
          <td style="padding:8px 6px;border-bottom:1px solid #e6e8ec;text-align:left;font-variant-numeric:tabular-nums;">${s.completed}/${s.total} · ${s.percent}%</td>
        </tr>`,
    )
    .join('');

  const moduleRows =
    summary.completedModules.length === 0
      ? `<li style="margin:4px 0;color:#667;">עדיין לא הושלם מודול מלא</li>`
      : summary.completedModules
          .map((m) => `<li style="margin:4px 0;">${m.code} · ${m.title}</li>`)
          .join('');

  root.innerHTML = `
    <div style="border:2px solid #00A79D;border-radius:12px;padding:28px 24px;">
      <p style="margin:0;color:#00A79D;font-weight:700;font-size:13px;">סולו נדלן</p>
      <h1 style="margin:8px 0 4px;font-size:28px;line-height:1.25;">${title}</h1>
      <p style="margin:0 0 16px;color:#556;font-size:14px;">${subtitle}</p>
      <p style="margin:0 0 20px;font-size:15px;font-weight:600;">${TRAINING_META.title}</p>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;">
        <div style="background:#f3faf9;border-radius:10px;padding:12px 16px;min-width:120px;">
          <div style="font-size:12px;color:#667;">התקדמות</div>
          <div style="font-size:28px;font-weight:800;color:#00A79D;">${summary.overallPercent}%</div>
        </div>
        <div style="background:#f3faf9;border-radius:10px;padding:12px 16px;min-width:120px;">
          <div style="font-size:12px;color:#667;">מודולים שהושלמו</div>
          <div style="font-size:22px;font-weight:800;">${summary.completed} / ${summary.total}</div>
        </div>
        <div style="background:#f3faf9;border-radius:10px;padding:12px 16px;min-width:120px;">
          <div style="font-size:12px;color:#667;">שבוע בתכנית</div>
          <div style="font-size:22px;font-weight:800;">${summary.weeks}</div>
        </div>
      </div>
      <h2 style="font-size:16px;margin:0 0 8px;">התקדמות לפי שלבים</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px;">${stageRows}</table>
      <h2 style="font-size:16px;margin:0 0 8px;">מודולים שהושלמו</h2>
      <ul style="padding-right:18px;margin:0 0 18px;font-size:13px;">${moduleRows}</ul>
      <p style="margin:0;font-size:11px;color:#889;line-height:1.5;">
        מסמך זה הופק אוטומטית מתוך האפליקציה בתאריך ${summary.issuedAt}.
        ההתקדמות נשמרת מקומית בדפדפן; מומלץ לייצא גיבוי מעמוד העזרה.
      </p>
    </div>
  `;
  return root;
}

/** Builds an off-screen certificate/summary and downloads it as PDF. */
export async function downloadTrainingCertificatePdf(
  progress: TrainingProgress = readTrainingProgress(),
): Promise<{ fileName: string; fullyComplete: boolean }> {
  const summary = buildCertificateSummary(progress);
  const el = buildCertificateElement(summary);
  el.style.position = 'fixed';
  el.style.left = '-10000px';
  el.style.top = '0';
  document.body.appendChild(el);

  const safeDate = summary.issuedAt.replace(/[^\d.-]/g, '-');
  const fileName = summary.fullyComplete
    ? `teudat-siyum-hachshara-${safeDate}.pdf`
    : `sikom-hitkadmut-hachshara-${safeDate}.pdf`;

  try {
    await exportToPdf(el, fileName);
  } finally {
    el.remove();
  }

  return { fileName, fullyComplete: summary.fullyComplete };
}

export function completedModuleIds(progress: TrainingProgress = readTrainingProgress()): string[] {
  return TRAINING_MODULES.filter((m) =>
    isModuleComplete(progress.modules[m.id] ?? emptyModule()),
  ).map((m) => m.id);
}

export function stageModuleCount(stageId: string): number {
  return modulesForStage(stageId).length;
}
