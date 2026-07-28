import { expect, test } from '@playwright/test';

test('protected safety routes redirect to login', async ({ page }) => {
  await page.goto('/safety/profile');
  await expect(page).toHaveURL(/\/safety\/login$/);
  await expect(page.getByRole('heading', { name: 'כניסה למערכת' })).toBeVisible();
});

test('employee registration form validates required details', async ({ page }) => {
  await page.goto('/safety/login');
  await page.getByRole('button', { name: /עובד חדש/ }).click();
  await expect(page.getByRole('heading', { name: 'פתיחת חשבון עובד' })).toBeVisible();

  const submit = page.getByRole('button', { name: 'יצירת חשבון' });
  await expect(submit).toBeDisabled();
  await page.getByPlaceholder('שם מלא').fill('עובד בדיקה');
  await page.getByPlaceholder('name@company.com').fill('worker@example.com');
  await page.getByPlaceholder(/סיסמה/).fill('123456');
  await expect(submit).toBeEnabled();
});

test('PWA manifest icons are available', async ({ request }) => {
  for (const path of [
    '/manifest.webmanifest',
    '/manifest-dossiers.webmanifest',
    '/pwa-192.png',
    '/pwa-512.png',
    '/apple-touch-icon.png',
    '/safety-pwa-192.png',
    '/safety-pwa-512.png',
    '/safety-apple-touch-icon.png',
  ]) {
    const response = await request.get(path);
    expect(response.ok(), `${path} should return successfully`).toBeTruthy();
  }
});

test('login fits mobile viewport without horizontal overflow', async ({ page }) => {
  await page.goto('/safety/login');
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test('employee can open a personal safety e-learning link without login', async ({ page }) => {
  await page.route('**/rest/v1/rpc/get_safety_elearning_assignment', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        status: 'in_progress',
        score: null,
        employee_name: 'עובד לומדה',
        employee_id_number: '123456789',
        client_name: 'לקוח בדיקה',
        course_version: 'general-safety-v1',
      }),
    });
  });

  await page.goto('/safety/learn/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  await expect(page.getByRole('heading', { name: 'לומדת בטיחות כללית' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'אחריות העובד והמעסיק' })).toBeVisible();
  await expect(page).not.toHaveURL(/\/safety\/login/);
  await page.getByRole('button', { name: /סיימתי את הפרק/ }).click();
  await expect(page.getByRole('heading', { name: 'זיהוי סיכונים וסביבת עבודה בטוחה' })).toBeVisible();
});
