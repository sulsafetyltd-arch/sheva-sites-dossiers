import { getModule } from '@/data/training-curriculum';
import { getInteractiveContent } from '@/data/interactive-content';
import { getModuleProgress } from '@/lib/training-store';
import { addTimeline, createDeal, getDeal, saveDeal } from '@/lib/real-estate-store';
import type { Deal, DealTask } from '@/types/real-estate';

function newId(): string {
  return crypto.randomUUID();
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDeliverableBody(moduleId: string): string {
  const mod = getModule(moduleId);
  const content = getInteractiveContent(moduleId);
  const progress = getModuleProgress(moduleId);
  const answers = progress.deliverableAnswers ?? {};

  const lines: string[] = [
    `=== תוצר הכשרה · מודול ${mod?.code ?? moduleId}: ${mod?.title ?? ''} ===`,
    `יעד למידה: ${content.learningGoal}`,
    '',
  ];

  for (const prompt of content.deliverablePrompts) {
    const answer = (answers[prompt.id] ?? '').trim();
    lines.push(`• ${prompt.label}`);
    lines.push(answer || '(טרם מולא)');
    lines.push('');
  }

  const notes = (progress.deliverableNotes ?? '').trim();
  if (notes && !Object.values(answers).some((a) => a.trim() === notes)) {
    lines.push('הערות נוספות:');
    lines.push(notes);
  }

  return lines.join('\n').trim();
}

/** מחיל את תוצר המודול על תיק קיים — הערות, ציר זמן ומשימה */
export function applyModuleDeliverableToDeal(moduleId: string, dealId: string): Deal {
  const deal = getDeal(dealId);
  if (!deal) throw new Error('תיק לא נמצא');
  const mod = getModule(moduleId);
  const body = formatDeliverableBody(moduleId);
  const stamp = new Date().toLocaleString('he-IL');

  const notesBlock = [deal.notes?.trim() || '', '', `--- הוחל מהכשרה (${stamp}) ---`, body]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const taskTitle = `יישום תוצר הכשרה · ${mod?.code ?? moduleId}`;
  const hasTask = deal.tasks.some((t) => t.title === taskTitle);
  const tasks: DealTask[] = hasTask
    ? deal.tasks
    : [
        {
          id: newId(),
          title: taskTitle,
          dueDate: todayIso(),
          done: false,
          priority: 'medium',
          notes: `מקור: מודול ${mod?.code ?? moduleId} — ${mod?.title ?? ''}`,
        },
        ...deal.tasks,
      ];

  let next: Deal = { ...deal, notes: notesBlock, tasks };
  next = saveDeal(next);
  return addTimeline(
    next,
    `תוצר הכשרה הוחל · מודול ${mod?.code ?? moduleId}`,
    body.slice(0, 500),
  );
}

/** פותח תיק חדש ומיישם אליו את תוצר המודול */
export function applyModuleDeliverableToNewDeal(moduleId: string): Deal {
  const mod = getModule(moduleId);
  const deal = createDeal({
    title: `תיק מתרגול · ${mod?.code ?? moduleId} ${mod?.title ?? ''}`.trim(),
  });
  return applyModuleDeliverableToDeal(moduleId, deal.id);
}
