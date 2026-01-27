
import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';

const ADMIN_BASE = 'http://127.0.0.1:3001/admin';
const EMAIL = 'auditor_admin@binapex.com';
const PASSWORD = 'Password123!';

test.use({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 }
});

test.describe('Auditor Evidence Collection - Phase 2: Admin Boss Mode', () => {

    test('1. Admin Oversight & Sensitive Data Access', async ({ page }) => {
        console.log('Admin: Logging in to', ADMIN_BASE);

        await page.goto(`${ADMIN_BASE}/admin/login`);

        const emailInput = page.locator('#email');
        const passInput = page.locator('#password');

        try {
            await expect(emailInput).toBeVisible({ timeout: 15000 });
        } catch (e) {
            console.warn('RETRY: Trying /admin/login...');
            await page.goto(`${ADMIN_BASE}/login`);
            await expect(emailInput).toBeVisible({ timeout: 15000 });
        }

        await emailInput.fill(EMAIL);
        await passInput.fill(PASSWORD);
        await page.getByRole('button', { name: /access control panel/i }).click();

        // Expect Dashboard Overview or the root /admin
        await expect(page).toHaveURL(/.*admin$|overview|dashboard.*/, { timeout: 15000 });
        console.log('Admin Dashboard Access Secured');
        await page.screenshot({ path: 'evidence_screenshots/admin_1_dashboard.png', fullPage: true });

        // --- USER SENSITIVE DETAILS ---
        console.log('Admin: Probing User Details for Sensitive Evidence');
        await page.goto(`${ADMIN_BASE}/users`); // Adjusting for basePath
        await page.waitForTimeout(5000);

        const detailLink = page.locator('a[href*="/users/"]').first();
        if (await detailLink.isVisible()) {
            await detailLink.click();
            await page.waitForTimeout(5000);

            const body = await page.textContent('body');
            const markers = {
                'IP Address': /IP|Address/i,
                'Location': /Location|Country/i,
                'Login Password': /Password|Login Password/i,
                'Withdrawal Password': /Withdrawal Password|Pin/i
            };

            for (const [name, regex] of Object.entries(markers)) {
                if (regex.test(body || '')) {
                    console.log(`[EVIDENCE] Found ${name} in User View`);
                } else {
                    console.warn(`[MISSING] ${name} not visible in User Details`);
                }
            }
            await page.screenshot({ path: 'evidence_screenshots/admin_2_user_detail_evidence.png', fullPage: true });
        }

        // --- TRADE OUTCOME CONTROL ---
        await page.goto(`${ADMIN_BASE}/trades`);
        await page.waitForTimeout(4000);
        await page.screenshot({ path: 'evidence_screenshots/admin_3_trades_list.png', fullPage: true });

        // --- MAINTENANCE CONTROLS ---
        await page.goto(`${ADMIN_BASE}/settings`);
        await page.waitForTimeout(4000);
        await page.screenshot({ path: 'evidence_screenshots/admin_4_settings_proof.png', fullPage: true });

        console.log('Phase 2 Admin Verification SUCCESS');
    });
});
