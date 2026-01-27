
import { test } from '@playwright/test';

test.use({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
});

test('Force Admin Screenshot', async ({ page }) => {
    console.log('Navigating to Admin Dashboard...');
    await page.goto('http://localhost:3001/admin/overview');
    await page.waitForTimeout(5000); // Give it plenty of time to render (even if empty)
    console.log('Taking Screenshot...');
    await page.screenshot({ path: 'evidence_screenshots/forced_admin.png', fullPage: true });
    console.log('Screenshot saved.');
});
