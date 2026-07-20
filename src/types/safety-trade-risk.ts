import type { TradeRiskCode, TradeRiskLanguage } from '@/lib/trade-risk-documents';

export type TradeRiskAssignmentStatus = 'assigned' | 'in_progress' | 'completed';

export interface SafetyClientSite {
  id: string;
  clientId: string;
  name: string;
  address?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SafetyTradeRiskAssignment {
  id: string;
  clientId: string;
  siteId: string;
  employeeId: string;
  tradeCode: TradeRiskCode;
  languageCode: TradeRiskLanguage;
  accessToken: string;
  status: TradeRiskAssignmentStatus;
  signerName?: string;
  signatureDataUrl?: string;
  acknowledgedAt?: string;
  createdAt: string;
  siteName?: string;
  employeeName?: string;
}

export interface PublicTradeRiskAssignment {
  id: string;
  status: TradeRiskAssignmentStatus;
  tradeCode: TradeRiskCode;
  languageCode: TradeRiskLanguage;
  tradeLabel: string;
  languageLabel: string;
  employeeName: string;
  employeeIdNumber?: string;
  clientName: string;
  siteName: string;
  siteAddress?: string;
  signerName?: string;
  signatureDataUrl?: string;
  acknowledgedAt?: string;
}
