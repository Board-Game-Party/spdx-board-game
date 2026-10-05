import { test, expect } from '../fixtures';
import { LoginPage } from '../pages/LoginPage';

test.describe('smoke', () => {
  test('homepage loads', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await expect(page).toHaveTitle(/PairEval/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(login.googleSignInButton).toBeVisible();
  });

  test('api health is reachable through the dev proxy', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
  });
});
