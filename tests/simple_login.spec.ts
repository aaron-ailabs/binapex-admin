
import { test, expect } from '@playwright/test';

test('Admin UI Login Test', async ({ page }) => {
    // Go to login page
    await page.goto('http://localhost:3001/admin/login');

    // Wait for initial auth check spinner to disappear
    // The text matches "Checking authentication..." in the loader
    await expect(page.locator('text=Checking authentication...')).not.toBeVisible({ timeout: 15000 });

    // Wait for the email input to be visible
    await page.waitForSelector('input[name="email"]', { state: 'visible', timeout: 10000 });

    // Fill credentials
    await page.fill('input[name="email"]', 'admin88@binapex.my');
    await page.fill('input[name="password"]', 'Admin8888@');

    // Click submit
    await page.click('button[type="submit"]');

    // Verify redirect or dashboard element
    // Wait for URL to change or "User Management" to appear
    await expect(page).toHaveURL(/.*\/admin/, { timeout: 15000 });
    await expect(page.locator('text=User Management')).toBeVisible({ timeout: 15000 });

    console.log('Login Successful');
});
