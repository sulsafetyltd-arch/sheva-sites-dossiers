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
  for (const path of ['/manifest.webmanifest', '/pwa-192.png', '/pwa-512.png', '/apple-touch-icon.png']) {
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
