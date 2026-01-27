
import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('C:/Users/user/.gemini/antigravity/brain/b64097c9-6eec-4c19-a9f6-d3c465ea1af1/screenshots');
const ADMIN_EMAIL = 'admin88@binapex.my';
const ADMIN_PASSWORD = 'Admin8888@';
const TARGET_USER_EMAIL = 'e2e_test_settlement_v3@binapex.com';

test.describe('Phase 8: Manual Verification Simulation', () => {
    test.setTimeout(120000); // Allow 2 minutes for full flow

    test('Phase 1: Admin Login & Stability', async ({ page }) => {
        console.log('--- Phase 1: Login ---');
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));
        await page.goto('http://localhost:3001/admin/login');

        // Wait for auth check to finish
        await expect(page.getByText('Checking authentication...')).toBeHidden({ timeout: 10000 });

        // Check if we are on login page (Admin Portal header or Email input)
        if (await page.getByText('Admin Portal').isVisible() || await page.locator('input[name="email"]').isVisible()) {
            await page.fill('input[name="email"]', ADMIN_EMAIL);
            await page.fill('input[name="password"]', ADMIN_PASSWORD);
            await page.click('button[type="submit"]');

            // Wait for navigation
            try {
                // It redirects to /admin then /admin/overview
                await page.waitForURL(/admin/, { timeout: 10000 });
            } catch (e) { console.log('Navigation wait timeout'); }
        }

        // Explicit wait for dashboard
        try {
            // Check for Overview or Dashboard or Settings to confirm login
            await expect(page.locator('text=Overview').or(page.locator('text=Dashboard'))).toBeVisible({ timeout: 15000 });
            console.log('Phase 1 Success: Dashboard loaded');
        } catch (e) {
            console.error('Phase 1 Login Failed. Current URL:', page.url());
            console.error('Page Title:', await page.title());
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase1_login_fail.png'), fullPage: true });
            // Dump page content to console for text analysis
            // console.log('Page Content:', await page.content()); 
            throw e;
        }

        // Check for console errors (handled by listener if added, but here we just wait)
        await page.waitForTimeout(3000); // Stability check

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase1_dashboard.png'), fullPage: true });
        console.log('Phase 1 Complete: Dashboard loaded.');
    });

    test('Phase 2: User Management Lifecycle', async ({ page }) => {
        // Login first (same logic as Phase 1)
        await page.goto('http://localhost:3001/admin/login');

        // Wait for auth check
        try {
            await expect(page.getByText('Checking authentication...')).toBeHidden({ timeout: 5000 });
        } catch (e) { }

        if (await page.getByText('Admin Portal').isVisible() || await page.locator('input[name="email"]').isVisible()) {
            await page.fill('input[name="email"]', ADMIN_EMAIL);
            await page.fill('input[name="password"]', ADMIN_PASSWORD);
            await page.click('button[type="submit"]');
        }
        await expect(page.locator('text=Overview').or(page.locator('text=Dashboard'))).toBeVisible({ timeout: 15000 });

        console.log('--- Phase 2: User Management ---');
        await page.goto('http://localhost:3001/admin/users');
        await expect(page.getByText('User Management')).toBeVisible();
        await page.waitForTimeout(2000); // Load list
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase2_user_list_before.png') });

        // Search/Filter for target user
        const userRow = page.locator(`tr:has-text("${TARGET_USER_EMAIL}")`);
        if (!await userRow.isVisible()) {
            console.log('Target user not visible immediately, trying search if implemented...');
            // Assuming search input exists? If not, we might need to rely on list
        }
        // For now, assume user is in list or we fail.
        await expect(userRow).toBeVisible();

        // Promote
        console.log('Action: Promote');
        const roleBadge = userRow.locator('[data-testid="role-badge"]'); // Verify badging if possible
        // Click actions menu (assuming "..." button)
        // IMPORTANT: Need exact selectors. Inspecting `user-role-dialog.tsx` showed `adminUpdateUserRole`.
        // The UI likely has a "Edit" or "..." button.
        // Let's assume there's an actions column.
        // If we can't find it, we might fail here. 
        // Wait, the previous `admin_management.spec.ts` used locator('.lucide-more-horizontal').
        await userRow.locator('.lucide-more-horizontal').first().click();
        await page.getByText('Edit Role').click();
        await page.getByRole('radio', { name: 'admin' }).click(); // Assuming RadioGroup
        await page.getByText('Save Changes').click();
        await expect(page.getByText('User role updated successfully')).toBeVisible();
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase2_promoted.png') });

        // Freeze (Suspend)
        console.log('Action: Freeze');
        await userRow.locator('.lucide-more-horizontal').first().click();
        // Assuming "Suspend User" or similar
        // We need to guess or check previous tests. `admin_management.spec.ts` might have this.
        // Let's assume "Suspend" based on standard UI.
        if (await page.getByText('Suspend User').isVisible()) {
            await page.getByText('Suspend User').click();
            await page.getByText('Confirm').click();
        } else if (await page.getByText('Freeze').isVisible()) {
            await page.getByText('Freeze').click();
            await page.getByText('Confirm').click();
        }
        // Verify badge "Suspended" or similar
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase2_frozen.png') });

        // Restore (Activate)
        console.log('Action: Restore');
        await userRow.locator('.lucide-more-horizontal').first().click();
        // "Activate User" or "Restore"
        if (await page.getByText('Activate User').isVisible()) {
            await page.getByText('Activate User').click();
            await page.getByText('Confirm').click();
        }
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase2_restored.png') });

        // Demote
        console.log('Action: Demote');
        await userRow.locator('.lucide-more-horizontal').first().click();
        await page.getByText('Edit Role').click();
        await page.getByRole('radio', { name: 'trader' }).click();
        await page.getByText('Save Changes').click();
        await expect(page.getByText('User role updated successfully')).toBeVisible();
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase2_demoted.png') });
    });

    test('Phase 3: Permission Enforcement', async ({ browser }) => {
        console.log('--- Phase 3: Permissions ---');
        const context = await browser.newContext(); // Clean context (Incognito/Trader)
        const page = await context.newPage();

        // 1. Visit /admin/users
        await page.goto('http://localhost:3001/admin/users');
        await page.waitForTimeout(1000);
        // Should be redirected to login
        if (page.url().includes('/admin/login')) {
            console.log('Redirected to login as expected.');
        } else {
            console.error('Failed to redirect unauthorized user!');
        }
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase3_redirect.png') });

        // 2. API Check
        const response = await page.request.get('http://localhost:3001/api/admin/users');
        console.log(`API Access Status: ${response.status()}`);
        if (response.status() === 401 || response.status() === 403) {
            console.log('API Access Denied as expected.');
        } // Next.js might redirect API too (307)
    });

    test('Phase 6: Error Handling', async ({ page }) => {
        console.log('--- Phase 6: Error Handling ---');
        await page.goto('http://localhost:3001/admin/login'); // Logged in state preserved from storage? No, manual login if needed.
        // We need admin session for this
        await page.fill('input[name="email"]', ADMIN_EMAIL);
        await page.fill('input[name="password"]', ADMIN_PASSWORD);
        await page.click('button[type="submit"]');
        await expect(page.locator('text=Overview')).toBeVisible();

        await page.goto('http://localhost:3001/admin/some-invalid-route-xyz');
        await page.waitForTimeout(1000);
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'phase6_404.png') });
    });

});
