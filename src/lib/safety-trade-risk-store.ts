import { supabase } from '@/integrations/supabase/client';
import {
  TRADE_RISK_DOCUMENTS,
  tradeRiskLabel,
  type TradeRiskCode,
  type TradeRiskLanguage,
} from '@/lib/trade-risk-documents';
import type {
  PublicTradeRiskAssignment,
  SafetyClientSite,
  SafetyTradeRiskAssignment,
} from '@/types/safety-trade-risk';
import type { SafetyClientEmployee } from '@/types/safety-employee';

type Row = Record<string, unknown>;

function fail(error: { message?: string } | null): void {
  if (error) throw new Error(error.message || 'פעולת תמצית הסיכונים נכשלה');
}

function mapSite(row: Row): SafetyClientSite {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    name: String(row.name),
    address: typeof row.address === 'string' ? row.address : undefined,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    active: row.active !== false,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapAssignment(row: Row): SafetyTradeRiskAssignment {
  return {
    id: String(row.id),
    clientId: String(row.client_id),
    siteId: String(row.site_id),
    employeeId: String(row.employee_id),
    tradeCode: String(row.trade_code) as TradeRiskCode,
    languageCode: String(row.language_code) as TradeRiskLanguage,
    accessToken: String(row.access_token),
    status: row.status as SafetyTradeRiskAssignment['status'],
    signerName: typeof row.signer_name === 'string' ? row.signer_name : undefined,
    signatureDataUrl: typeof row.signature_data_url === 'string' ? row.signature_data_url : undefined,
    acknowledgedAt: typeof row.acknowledged_at === 'string' ? row.acknowledged_at : undefined,
    createdAt: String(row.created_at),
    siteName: typeof row.site_name === 'string' ? row.site_name : undefined,
    employeeName: typeof row.employee_name === 'string' ? row.employee_name : undefined,
  };
}

export async function listClientSites(clientId: string): Promise<SafetyClientSite[]> {
  const { data, error } = await supabase
    .from('safety_client_sites')
    .select('*')
    .eq('client_id', clientId)
    .order('name', { ascending: true });
  fail(error);
  return (data ?? []).map((row) => mapSite(row as Row));
}

export async function createClientSite(input: {
  clientId: string;
  name: string;
  address?: string;
  notes?: string;
}): Promise<SafetyClientSite> {
  const { data, error } = await supabase
    .from('safety_client_sites')
    .insert({
      client_id: input.clientId,
      name: input.name.trim(),
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .select('*')
    .single();
  fail(error);
  return mapSite(data as Row);
}

export async function updateClientSite(
  id: string,
  partial: Partial<Pick<SafetyClientSite, 'name' | 'address' | 'notes' | 'active'>>,
): Promise<SafetyClientSite> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (partial.name !== undefined) payload.name = partial.name.trim();
  if (partial.address !== undefined) payload.address = partial.address?.trim() || null;
  if (partial.notes !== undefined) payload.notes = partial.notes?.trim() || null;
  if (partial.active !== undefined) payload.active = partial.active;
  const { data, error } = await supabase
    .from('safety_client_sites')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();
  fail(error);
  return mapSite(data as Row);
}

export async function listTradeRiskAssignments(clientId: string): Promise<SafetyTradeRiskAssignment[]> {
  const [{ data, error }, sites, employeesResult] = await Promise.all([
    supabase
      .from('safety_trade_risk_assignments')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false }),
    listClientSites(clientId),
    supabase
      .from('safety_client_employees')
      .select('id, full_name')
      .eq('client_id', clientId),
  ]);
  fail(error);
  fail(employeesResult.error);
  const siteNames = new Map(sites.map((site) => [site.id, site.name]));
  const employeeNames = new Map(
    (employeesResult.data ?? []).map((row) => [String(row.id), String(row.full_name)]),
  );
  return (data ?? []).map((row) => {
    const raw = row as Row;
    return mapAssignment({
      ...raw,
      site_name: siteNames.get(String(raw.site_id)),
      employee_name: employeeNames.get(String(raw.employee_id)),
    });
  });
}

export async function createTradeRiskAssignment(input: {
  employee: SafetyClientEmployee;
  siteId: string;
  tradeCode: TradeRiskCode;
  languageCode: TradeRiskLanguage;
}): Promise<SafetyTradeRiskAssignment> {
  if (!TRADE_RISK_DOCUMENTS.some(
    (document) => document.tradeCode === input.tradeCode && document.language === input.languageCode,
  )) {
    throw new Error('לא נמצא מסמך תמצית סיכונים למקצוע ולשפה שנבחרו');
  }
  const { data: authData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('safety_trade_risk_assignments')
    .insert({
      client_id: input.employee.clientId,
      site_id: input.siteId,
      employee_id: input.employee.id,
      trade_code: input.tradeCode,
      language_code: input.languageCode,
      created_by: authData.user?.id,
    })
    .select('*')
    .single();
  fail(error);
  return mapAssignment(data as Row);
}

export async function deleteTradeRiskAssignment(id: string): Promise<void> {
  const { error } = await supabase.from('safety_trade_risk_assignments').delete().eq('id', id);
  fail(error);
}

export function tradeRiskShareUrl(accessToken: string): string {
  // Use /?tr=<token> so the browser always loads index.html.
  // Path-based deep links (/t/..., /safety/trade-risk/...) break in WhatsApp/RTL
  // and can hit stale PWA shells that render the React 404 page.
  const url = new URL(import.meta.env.BASE_URL || '/', window.location.origin);
  url.searchParams.set('tr', accessToken);
  return url.toString();
}

export function tradeRiskShareMessage(options: {
  employeeName: string;
  tradeLabel: string;
  siteName: string;
  url: string;
}): string {
  // Embed the URL in the text body with an LTR mark so RTL apps don't break it.
  return [
    `שלום ${options.employeeName},`,
    `נא לקרוא ולחתום על תמצית הסיכונים למקצוע ${options.tradeLabel} באתר ${options.siteName}.`,
    '',
    'לחצו על הקישור:',
    `\u200E${options.url}`,
  ].join('\n');
}

export async function getPublicTradeRiskAssignment(token: string): Promise<PublicTradeRiskAssignment> {
  const { data, error } = await supabase.rpc('get_safety_trade_risk_assignment', { p_token: token });
  fail(error);
  const row = data as Row;
  const tradeCode = String(row.trade_code) as TradeRiskCode;
  const languageCode = String(row.language_code) as TradeRiskLanguage;
  const document = TRADE_RISK_DOCUMENTS.find(
    (item) => item.tradeCode === tradeCode && item.language === languageCode,
  );
  return {
    id: String(row.id),
    status: row.status as PublicTradeRiskAssignment['status'],
    tradeCode,
    languageCode,
    tradeLabel: tradeRiskLabel(tradeCode),
    languageLabel: document?.languageLabel || languageCode,
    employeeName: String(row.employee_name),
    employeeIdNumber: typeof row.employee_id_number === 'string' ? row.employee_id_number : undefined,
    clientName: String(row.client_name),
    siteName: String(row.site_name),
    siteAddress: typeof row.site_address === 'string' ? row.site_address : undefined,
    signerName: typeof row.signer_name === 'string' ? row.signer_name : undefined,
    signatureDataUrl: typeof row.signature_data_url === 'string' ? row.signature_data_url : undefined,
    acknowledgedAt: typeof row.acknowledged_at === 'string' ? row.acknowledged_at : undefined,
  };
}

export async function completePublicTradeRisk(
  token: string,
  signerName: string,
  signatureDataUrl: string,
): Promise<{ status: string; acknowledgedAt?: string; signerName?: string }> {
  const { data, error } = await supabase.rpc('complete_safety_trade_risk', {
    p_token: token,
    p_signer_name: signerName,
    p_signature_data_url: signatureDataUrl,
  });
  fail(error);
  const row = data as Row;
  return {
    status: String(row.status),
    acknowledgedAt: typeof row.acknowledged_at === 'string' ? row.acknowledged_at : undefined,
    signerName: typeof row.signer_name === 'string' ? row.signer_name : undefined,
  };
}
