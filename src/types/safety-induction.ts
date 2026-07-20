import type { ConstructionInductionLanguage } from '@/types/safety-training';

export type InductionAssignmentStatus = 'assigned' | 'in_progress' | 'completed';

export interface SafetyInductionAssignment {
  id: string;
  clientId: string;
  siteId: string;
  employeeId: string;
  languageCode: ConstructionInductionLanguage;
  accessToken: string;
  status: InductionAssignmentStatus;
  signerName?: string;
  signerIdNumber?: string;
  jobTitle?: string;
  declarationDate?: string;
  companyName?: string;
  instructorName?: string;
  siteManagerName?: string;
  heightTrainingValidUntil?: string;
  signatureDataUrl?: string;
  acknowledgedAt?: string;
  createdAt: string;
  siteName?: string;
  employeeName?: string;
}

export interface PublicInductionAssignment {
  id: string;
  status: InductionAssignmentStatus;
  languageCode: ConstructionInductionLanguage;
  languageLabel: string;
  employeeName: string;
  employeeIdNumber?: string;
  employeeJobTitle?: string;
  clientName: string;
  siteName: string;
  siteAddress?: string;
  signerName?: string;
  signerIdNumber?: string;
  jobTitle?: string;
  declarationDate?: string;
  companyName?: string;
  instructorName?: string;
  siteManagerName?: string;
  heightTrainingValidUntil?: string;
  signatureDataUrl?: string;
  acknowledgedAt?: string;
  certificateNumber?: string;
}

export interface InductionDeclarationInput {
  signerName: string;
  signerIdNumber: string;
  jobTitle: string;
  declarationDate: string;
  companyName: string;
  instructorName: string;
  siteManagerName: string;
  heightTrainingValidUntil?: string;
  signatureDataUrl: string;
}
