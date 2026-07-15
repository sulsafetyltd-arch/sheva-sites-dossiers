export type SafetyDomain =
  | 'construction'
  | 'factory'
  | 'office'
  | 'warehouse'
  | 'public'
  | 'infrastructure'
  | 'general';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type ReportStatus = 'draft' | 'analyzing' | 'ready' | 'exported';

export interface DefectPhoto {
  id: string;
  url: string;
  /** Local preview before/while uploading (data URL) */
  previewUrl?: string;
  caption: string;
  timestamp: string;
}

export interface AiDetection {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: string;
  regulationHint?: string;
  recommendation: string;
  confidence: number;
  /** Whether the finding was AI-suggested or manually added */
  source: 'ai' | 'manual';
  locationNote?: string;
  status: 'open' | 'accepted' | 'rejected' | 'fixed';
}

export interface SafetyReport {
  id: string;
  title: string;
  siteName: string;
  address: string;
  inspectorName: string;
  domain: SafetyDomain;
  status: ReportStatus;
  photos: DefectPhoto[];
  detections: AiDetection[];
  notes: string;
  createdAt: string;
  updatedAt: string;
  analyzedAt?: string;
  analysisMode?: 'vision-api' | 'local-ai' | 'manual';
}

export type SafetyReportMeta = Pick<
  SafetyReport,
  'id' | 'title' | 'siteName' | 'domain' | 'status' | 'createdAt' | 'updatedAt'
> & {
  defectCount: number;
  criticalCount: number;
};
