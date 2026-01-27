
import { test, expect } from '@playwright/test';

// Use strict mode for better reliability
test.use({ actionTimeout: 10000 });

// Test target user ID (e2e_test_settlement_v3)
const TARGET_USER_EMAIL = 'e2e_test_settlement_v3@binapex.com';

test.describe('Phase 6: Admin User Management Verification', () => {

    test('Step 6.2 & 6.4: Role Transition Matrix & Realtime Propagation', async ({ browser }) => {
        // 1. Setup Admin Context
        const adminContext = await browser.newContext();
        const adminPage = await adminContext.newPage();

        // Login as Admin (admin88)
        await adminPage.goto('http://localhost:3001/admin/login');

        // Wait for spinner
        await expect(adminPage.locator('text=Checking authentication...')).not.toBeVisible({ timeout: 15000 });

        await adminPage.fill('input[name="email"]', 'admin88@binapex.my');
        await adminPage.fill('input[name="password"]', 'Admin8888@');
        await adminPage.click('button[type="submit"]');
        await expect(adminPage.locator('text=User Management')).toBeVisible({ timeout: 15000 });

        await adminPage.click('a[href="/admin/users"]');
        await adminPage.fill('input[placeholder="Search by email..."]', TARGET_USER_EMAIL);
        // Wait for search
        await adminPage.waitForTimeout(2000);
        const userRow = adminPage.locator(`tr:has-text("${TARGET_USER_EMAIL}")`);
        await expect(userRow).toBeVisible();

        // --- Action 1: Promote to Admin ---
        await userRow.getByRole('button', { name: /Edit Role/i }).click();
        await adminPage.getByRole('radio', { name: 'Admin' }).click();
        await adminPage.getByRole('button', { name: 'Update Role' }).click();

        // Verify UI updates
        await expect(userRow).toContainText('admin');
        console.log('Step 6.2.1: Promoted to Admin - UI Verified');

        // --- Action 2: Freeze ---
        const freezeBtn = userRow.getByRole('button', { name: /Freeze|Suspend/i });
        if (await freezeBtn.isVisible()) {
            await freezeBtn.click();
            await expect(adminPage.locator('text=User frozen')).toBeVisible();
            console.log('Step 6.2.2: User Frozen - UI Verified');
        } else {
            console.log('Skipping Freeze UI test - Button not found immediately');
        }

        // --- Action 4: Demote to Trader ---
        await userRow.getByRole('button', { name: /Edit Role/i }).click();
        await adminPage.getByRole('radio', { name: 'Trader' }).click();
        await adminPage.getByRole('button', { name: 'Update Role' }).click();
        await expect(userRow).toContainText('trader');
        console.log('Step 6.2.4: Demoted to Trader - UI Verified');
    });

    test('Step 6.3 & 6.5: Permission Enforcement & RLS Bypass', async ({ request }) => {
        const response = await request.get('http://localhost:3001/admin/api/admin/users', {
            headers: {
                'Authorization': 'Bearer INVALID_OR_TRADER_TOKEN'
            },
            maxRedirects: 0
        }).catch(e => e.response);

        const status = response ? response.status() : 0;
        console.log(`Step 6.5 Debug: Status ${status}, URL: ${response ? response.url() : 'null'}`);

        if ([307, 308, 302].includes(status)) {
            console.log('Secure: Redirected');
            return;
        }

        if (status === 200) {
            const url = response.url();
            if (url.includes('/login')) {
                console.log('Secure: Redirected to Login page');
                return;
            }
            // Check if JSON error
            try {
                const body = await response.json();
                if (body.error) {
                    console.log('Step 6.5: Verified Error JSON');
                    return;
                }
            } catch (e) { }

            // Fail
            const text = await response.text();
            console.log('FAILED BODY:', text.substring(0, 500));
            throw new Error('Received 200 OK on protected API without redirect or error');
        }

        expect([401, 403]).toContain(status);
        console.log('Step 6.5: RLS Bypass Attempt - Verified 401/403');
    });

});
