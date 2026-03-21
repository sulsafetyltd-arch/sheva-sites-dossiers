import { Dossier } from '@/types/dossier';
import { sectionConfigs } from '@/data/section-config';

export interface ValidationIssue {
  sectionId: string;
  sectionTitle: string;
  fieldKey: string;
  fieldLabel: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

export interface SectionScore {
  sectionId: string;
  title: string;
  filled: number;
  total: number;
  percent: number;
  issues: ValidationIssue[];
}

export interface ValidationReport {
  sections: SectionScore[];
  totalScore: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  readinessLevel: 'low' | 'medium' | 'high' | 'complete';
}

// Critical fields per building type that must be filled
const criticalFieldsByType: Record<string, { sectionId: string; fieldKey: string }[]> = {
  commercial: [
    { sectionId: 'waterSystems', fieldKey: 'sprinklerSystem' },
    { sectionId: 'waterSystems', fieldKey: 'hydrantLocations' },
    { sectionId: 'detection', fieldKey: 'alarmSystem' },
    { sectionId: 'assembly', fieldKey: 'primaryAssembly' },
  ],
  industrial: [
    { sectionId: 'buildingDescription', fieldKey: 'hazardousMaterials' },
    { sectionId: 'electrical', fieldKey: 'generatorDetails' },
    { sectionId: 'waterSystems', fieldKey: 'sprinklerSystem' },
  ],
  residential: [
    { sectionId: 'escapeRoutes', fieldKey: '_hasRows' },
    { sectionId: 'assembly', fieldKey: 'primaryAssembly' },
  ],
  office: [
    { sectionId: 'detection', fieldKey: 'alarmSystem' },
    { sectionId: 'assembly', fieldKey: 'primaryAssembly' },
    { sectionId: 'procedures', fieldKey: 'evacuationProcedure' },
  ],
  public: [
    { sectionId: 'assembly', fieldKey: 'primaryAssembly' },
    { sectionId: 'assembly', fieldKey: 'specialNeeds' },
    { sectionId: 'procedures', fieldKey: 'evacuationProcedure' },
  ],
};

export function validateDossier(dossier: Dossier): ValidationReport {
  const issues: ValidationIssue[] = [];
  const sectionScores: SectionScore[] = [];
  const buildingType = dossier.data?.generalDetails?.buildingType || '';

  for (const section of sectionConfigs) {
    const data = dossier.data[section.id];
    const sectionIssues: ValidationIssue[] = [];
    let filled = 0;
    let total = 0;

    if (section.fields) {
      total = section.fields.length;
      for (const field of section.fields) {
        const val = data?.[field.key];
        const isFilled = val !== undefined && val !== '';

        if (isFilled) filled++;

        if (field.required && !isFilled) {
          sectionIssues.push({
            sectionId: section.id,
            sectionTitle: section.title,
            fieldKey: field.key,
            fieldLabel: field.label,
            severity: 'critical',
            message: `שדה חובה חסר: ${field.label}`,
          });
        }
      }
    }

    if (section.repeatable) {
      total = 1; // At least one row expected
      if (Array.isArray(data) && data.length > 0) {
        filled = 1;
      } else {
        sectionIssues.push({
          sectionId: section.id,
          sectionTitle: section.title,
          fieldKey: '_rows',
          fieldLabel: section.title,
          severity: section.id === 'contacts' || section.id === 'escapeRoutes' ? 'critical' : 'warning',
          message: `לא הוזנו נתונים בסעיף ${section.title}`,
        });
      }
    }

    // Check building-type-specific critical fields
    const criticals = criticalFieldsByType[buildingType] || [];
    for (const cf of criticals) {
      if (cf.sectionId === section.id && cf.fieldKey !== '_hasRows') {
        const val = data?.[cf.fieldKey];
        if (!val || val === '') {
          const existing = sectionIssues.find(i => i.fieldKey === cf.fieldKey);
          if (!existing) {
            const fieldConfig = section.fields?.find(f => f.key === cf.fieldKey);
            sectionIssues.push({
              sectionId: section.id,
              sectionTitle: section.title,
              fieldKey: cf.fieldKey,
              fieldLabel: fieldConfig?.label || cf.fieldKey,
              severity: 'warning',
              message: `שדה מומלץ לסוג מבנה "${buildingType}": ${fieldConfig?.label || cf.fieldKey}`,
            });
          }
        }
      }
    }

    const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
    sectionScores.push({
      sectionId: section.id,
      title: section.title,
      filled,
      total,
      percent,
      issues: sectionIssues,
    });
    issues.push(...sectionIssues);
  }

  const totalScore = Math.round(
    sectionScores.reduce((sum, s) => sum + s.percent, 0) / sectionScores.length
  );

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  let readinessLevel: ValidationReport['readinessLevel'] = 'low';
  if (totalScore >= 90 && criticalCount === 0) readinessLevel = 'complete';
  else if (totalScore >= 70 && criticalCount === 0) readinessLevel = 'high';
  else if (totalScore >= 40) readinessLevel = 'medium';

  return {
    sections: sectionScores,
    totalScore,
    criticalCount,
    warningCount,
    infoCount,
    readinessLevel,
  };
}

export const readinessLabels: Record<string, { label: string; color: string }> = {
  low: { label: 'נמוכה', color: 'text-destructive' },
  medium: { label: 'בינונית', color: 'text-warning' },
  high: { label: 'גבוהה', color: 'text-success' },
  complete: { label: 'מלאה', color: 'text-success' },
};
