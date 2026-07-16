export type RiskLevel = 'low' | 'medium' | 'high';
export type ReportStatus = 'draft' | 'final';
export type ChecklistStatus = 'ok' | 'not_ok' | 'na';
export type DefectSeverity = 'high' | 'medium' | 'low';

export interface SafetyAuditReport {
  id: string;
  reportNumber?: string;
  date: string; // ISO date
  recipient?: string;
  riskLevel?: RiskLevel;
  immediateAction?: boolean;
  executiveSummary?: string;
  siteName?: string;
  contractor?: string;
  auditDate?: string; // ISO date
  auditor?: string;
  attendees?: string;
  siteManager?: string;
  workHours?: string;
  workersCount?: number;
  workStage?: string;
  status: ReportStatus;
  siteManagerSignatureUrl?: string;
  auditorSignatureUrl?: string;
  checklist?: Record<string, { status: ChecklistStatus; notes?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyAuditDefect {
  id: string;
  reportId: string;
  checklistTopicKey?: string;
  description: string;
  severity: DefectSeverity;
  correctiveAction?: string;
  responsible?: string;
  dueDate?: string; // ISO date
  sortOrder?: number;
  createdAt: string;
}

export interface SafetyAuditDefectPhoto {
  id: string;
  defectId: string;
  storagePath: string;
  caption?: string;
  takenAt?: string; // ISO
  createdAt: string;
}

export const CHECKLIST_TOPICS: { key: string; title: string }[] = [
  { key: 'traffic_and_signage', title: 'הסדרי תנועה ושילוט הכוונה' },
  { key: 'heavy_machinery_insurance', title: 'כלים הנדסיים בשטח – ביטוח ורישיונות בתוקף' },
  { key: 'portable_tools', title: 'כלי עבודה מטלטלים – תקינות ובדיקות' },
  { key: 'safety_signage', title: 'שילוט בטיחות ואזהרה' },
  { key: 'electric', title: 'חשמל – לוחות, כבילה והארקה' },
  { key: 'ppe', title: 'ציוד מגן אישי (קסדה, נעליים, אפוד, רתמות)' },
  { key: 'fencing', title: 'גידור והפרדת אזור העבודה' },
  { key: 'hygiene', title: 'גהות – מנוחה, הפסקות, שירותים ומי שתייה' },
  { key: 'training', title: 'הדרכות בטיחות והחתמת עובדים בשפה מובנת' },
  { key: 'management', title: 'ניהול עבודה ופיקוח בטיחותי באתר' },
];

