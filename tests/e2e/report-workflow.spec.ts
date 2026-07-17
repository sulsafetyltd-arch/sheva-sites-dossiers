import { expect, test, type Page, type Route } from '@playwright/test';

const SUPABASE_ORIGIN = 'https://vwgkwhycbnyasolmbmqd.supabase.co';
const REPORT_ID = '11111111-1111-4111-8111-111111111111';
const CLIENT_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';

const user = {
  id: USER_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'admin@example.com',
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'ממונה בדיקה' },
  created_at: new Date().toISOString(),
};

const profile = {
  id: USER_ID,
  email: user.email,
  full_name: 'ממונה בדיקה',
  job_title: 'ממונה בטיחות',
  phone: '050-0000000',
  role: 'admin',
  is_active: true,
  created_at: new Date().toISOString(),
};

const initialReport = {
  id: REPORT_ID,
  client_id: CLIENT_ID,
  report_type: 'workplace',
  report_number: 'SB-2026-900',
  date: '2026-07-17',
  audit_date: '2026-07-17',
  site_name: 'אתר בדיקה',
  recipient: 'לקוח בדיקה',
  status: 'draft',
  checklist: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

async function seedAuthenticatedSession(page: Page) {
  await page.addInitScript(({ key, session }) => {
    const encode = (value: object) =>
      btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    const accessToken = [
      encode({ alg: 'none', typ: 'JWT' }),
      encode({
        sub: session.user.id,
        role: 'authenticated',
        aud: 'authenticated',
        exp: session.expires_at,
      }),
      '',
    ].join('.');
    localStorage.setItem(key, JSON.stringify({ ...session, access_token: accessToken }));
  }, {
    key: 'sb-vwgkwhycbnyasolmbmqd-auth-token',
    session: {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user,
    },
  });
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*' },
    body: JSON.stringify(body),
  });
}

test('authorized auditor completes checklist and creates one defect', async ({ page }) => {
  await seedAuthenticatedSession(page);
  let report = { ...initialReport };
  const defects: Record<string, unknown>[] = [];

  await page.route(`${SUPABASE_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === '/auth/v1/user') return json(route, user);
    if (path === '/rest/v1/profiles') return json(route, profile);
    if (path === '/rest/v1/safety_audit_reports' && request.method() === 'GET') {
      return json(route, report);
    }
    if (path === '/rest/v1/safety_audit_reports' && request.method() === 'PATCH') {
      report = { ...report, ...(request.postDataJSON() as object), updated_at: new Date().toISOString() };
      return json(route, report);
    }
    if (path === '/rest/v1/safety_audit_defects' && request.method() === 'GET') {
      return json(route, defects);
    }
    if (path === '/rest/v1/rpc/create_safety_defect') {
      const payload = request.postDataJSON();
      const existing = defects.find((item) => item.checklist_topic_key === payload.p_checklist_topic_key);
      if (existing) return json(route, existing);
      const defect = {
        id: '44444444-4444-4444-8444-444444444444',
        report_id: REPORT_ID,
        checklist_topic_key: payload.p_checklist_topic_key,
        description: payload.p_description,
        severity: payload.p_severity,
        corrective_action: payload.p_corrective_action,
        responsible: payload.p_responsible,
        due_date: null,
        sort_order: 0,
        created_at: new Date().toISOString(),
      };
      defects.push(defect);
      return json(route, defect);
    }
    return json(route, []);
  });

  await page.goto(`/safety/editor/${REPORT_ID}`);
  await expect(page.getByRole('heading', { name: 'אתר בדיקה' })).toBeVisible();

  await page.getByRole('button', { name: /הבא/ }).click();
  await expect(page.getByText('הסדרי תנועה ושילוט הכוונה')).toBeVisible();

  await page.getByRole('button', { name: 'לא תקין' }).first().click();
  await page.getByRole('button', { name: /הבא/ }).click();

  await expect(page.getByText('ליקוי #1')).toBeVisible();
  await expect(page.locator('textarea').first()).toHaveValue(/הסדרי תנועה ושילוט/);
  expect(defects).toHaveLength(1);
  expect((report.checklist as Record<string, { status: string }>).traffic_and_signage.status).toBe('not_ok');
});
