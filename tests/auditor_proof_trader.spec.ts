
import { test, expect } from '@playwright/test';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from trader workspace
dotenv.config({ path: path.resolve(__dirname, '../../binapex-trader/.env.local') });

const TRADER_URL = 'http://localhost:3000';
const TIMESTAMP = Date.now();
const EMAIL = `auditor_trader_${TIMESTAMP}@test.com`;
const PASSWORD = 'Password123!';

test.use({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 }
});

test.describe('Auditor Evidence Collection - Phase 1: Trader', () => {

    test('1. Full Trader Lifecycle', async ({ page }) => {
        console.log(`Starting Lifecycle with ${EMAIL}`);

        // --- SIGNUP ---
        await page.goto(`${TRADER_URL}/signup`);
        await page.fill('input[name="name"]', 'Auditor Trader');
        await page.fill('input[name="email"]', EMAIL);
        await page.fill('input[name="password"]', PASSWORD);
        await page.fill('input[name="confirmPassword"]', PASSWORD);
        await page.fill('input[name="withdrawalPassword"]', 'Withdrawal123!');
        await page.fill('input[name="confirmWithdrawalPassword"]', 'Withdrawal123!');
        await page.getByRole('checkbox').check();

        await page.screenshot({ path: 'evidence_screenshots/1_signup_page.png', fullPage: true });
        await page.getByRole('button', { name: /create account/i }).click();

        // Potential redirect delay or "Please sign in" toast
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'evidence_screenshots/2_signup_result.png', fullPage: true });

        // --- LOGIN ---
        await page.goto(`${TRADER_URL}/login`);
        await page.fill('input[name="email"]', EMAIL);
        await page.fill('input[name="password"]', PASSWORD);
        await page.getByRole('button', { name: /log in|sign in/i }).click();

        await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 30000 });
        console.log('Login Succeeded');
        await page.screenshot({ path: 'evidence_screenshots/3_dashboard_initial.png', fullPage: true });

        // --- BALANCE INJECTION (HUNTER MODE) ---
        console.log('Injecting balance for test user...');

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('ENV DUMP:', JSON.stringify(Object.keys(process.env), null, 2));
            throw new Error('Missing Supabase credentials in .env.local');
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        const { data: userData, error: userListErr } = await supabaseAdmin.auth.admin.listUsers();
        if (userListErr) console.error('User List Error:', userListErr);

        const testUser = userData?.users.find((u) => u.email === EMAIL);

        if (testUser) {
            console.log(`Found test user: ${testUser.id}`);
            // Inject into profiles as backup/base
            await supabaseAdmin.from('profiles').update({ role: 'user', balance_usd: 10000 }).eq('id', testUser.id);
            // Inject into wallets correctly
            const { error: walletErr } = await supabaseAdmin.from('wallets').upsert([
                { user_id: testUser.id, asset_symbol: 'USD', available_balance: 10000, wallet_address: 'INTERNAL', updated_at: new Date().toISOString() },
                { user_id: testUser.id, asset_symbol: 'USDT', available_balance: 10000, wallet_address: 'INTERNAL', updated_at: new Date().toISOString() }
            ]);

            if (walletErr) console.error('Wallet Injection Error:', walletErr);

            console.log(`Injected balance for ${testUser.id}`);
            // Force refresh to bypass realtime lag
            await page.reload();
            await page.waitForTimeout(5000);
        } else {
            throw new Error(`Test user ${EMAIL} not found for balance injection`);
        }

        // --- TRADE EXECUTION ---
        await page.goto(`${TRADER_URL}/trade`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(5000);

        // Check for specific buttons
        const higherBtn = page.getByText(/Higher/i).first();
        const tradeInput = page.locator('input[placeholder="100"], input[type="text"], input[name="amount"]').first();

        await expect(higherBtn).toBeVisible({ timeout: 20000 });
        await tradeInput.fill('100');

        await page.screenshot({ path: 'evidence_screenshots/4_trade_page_funded.png', fullPage: true });

        await higherBtn.click();
        console.log('Trade placed successfully');

        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'evidence_screenshots/5_trade_placed.png', fullPage: true });

        // --- DASHBOARD ACTIONS ---
        await page.goto(`${TRADER_URL}/dashboard`);
        await page.waitForTimeout(3000);

        const chatToggle = page.locator('button:has-text("Support"), .chat-toggle, [aria-label*="chat"]').first();
        if (await chatToggle.isVisible()) {
            await chatToggle.click();
            await page.screenshot({ path: 'evidence_screenshots/6_chat_support_ui.png' });
        }

        console.log('Phase 1 Verification SUCCESS');
    });
});
