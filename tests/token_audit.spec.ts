import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env (using trader's env as verified in other tests)
dotenv.config({ path: path.resolve('c:/Users/user/Documents/workspace/binapex-trader/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const projectRef = supabaseUrl.split('.')[0].split('//')[1];
const cookieName = `sb-${projectRef}-auth-token`;

test.describe('Phase 2: Client Token & Realtime Audit', () => {
    // We'll test both Admin (3001) and Trader (3000)
    const APPS = [
        { name: 'Admin App', url: 'http://localhost:3001/admin/login' },
        { name: 'Trader App', url: 'http://localhost:3000/login' }
    ];

    let validSession: any = null;

    test.beforeAll(async () => {
        // Generate a valid session once
        if (!supabaseUrl || !supabaseKey) throw new Error("Missing Env");
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Create a test user or sign in
        const email = `test_ws_audit_${Date.now()}@example.com`;
        const password = 'password123';

        console.log(`[Setup] Creating test user: ${email}`);
        const { data, error } = await supabase.auth.signUp({ email, password });

        if (data.session) {
            validSession = data.session;
            console.log(`[Setup] Got valid session. Token: ${validSession.access_token.substring(0, 15)}...`);
        } else {
            // If signup requires confirmation, maybe try sign in with a known user if possible?
            // Or just proceed and see if we can get a session differently.
            // For now, assume this works or local dev has auto-confirm.
            if (error) console.error(`[Setup] Signup error: ${error.message}`);
            else console.log(`[Setup] Signup successful but no session (email confirmation?): ${data.user?.id}`);
        }
    });

    for (const app of APPS) {
        test(`[${app.name}] Inject Session, Dump Cookies & Trace WS`, async ({ page, context }) => {
            console.log(`\n--- Auditing ${app.name} ---`);

            // 1. Inject Session Cookies if we have a session
            if (validSession) {
                const cookieValue = JSON.stringify([validSession.access_token, validSession.refresh_token]);
                // Supabase SSR cookie format is often just the tokens stringified encoded? 
                // Actually it's complex. safer to use:
                // `sb-<ref>-auth-token` = `base64-header.base64-payload.signature` (access_token) ?
                // No, Supabase Auth Helpers/SSR usually store the whole session or just tokens.
                // Let's try storing the `access_token` and `refresh_token` as a JSON string, which is common.
                // Actually, let's just dump what's there first (without injection) to see the baseline,
                // THEN inject if empty.

                // For this run, let's try to set it:
                const sessionStr = JSON.stringify(validSession);
                // Note: @supabase/ssr might expect specific structure. 
                // We'll try setting the cookie "sb-<ref>-auth-token" with the session string.

                await context.addCookies([{
                    name: cookieName,
                    value: `["${validSession.access_token}","${validSession.refresh_token}"]`, // Common format for older helpers, SSR might be different.
                    // If SSR, it might be `base64` or `jwe`.
                    // Let's rely on validSession being useful if we can.
                    // For now, we will perform the test without robust injection if we are unsure of format,
                    // BUT we will log what we see.
                    domain: 'localhost',
                    path: '/',
                    httpOnly: false, // Client needs to read it? SSR client reads cookies.
                    secure: false,
                    sameSite: 'Lax'
                }]);
                console.log(`[${app.name}] Injected cookie: ${cookieName}`);
            }

            // 2. Monitor WebSocket connections
            const wsRequests: any[] = [];
            page.on('websocket', ws => {
                const url = ws.url();
                if (url.includes('webpack')) return; // Ignore HMR

                console.log(`[WS] Connection initiated: ${url}`);
                wsRequests.push({ url, ws });


                ws.on('framesent', event => {
                    // Check for access_token in payload
                    const payload = event.payload.toString();
                    if (payload.includes('access_token')) {
                        console.log(`[WS] OUTGOING FRAME (Contains Token): ${payload.substring(0, 100)}...`);
                    } else {
                        console.log(`[WS] OUTGOING FRAME: ${payload}`);
                    }
                });

                ws.on('framereceived', event => {
                    console.log(`[WS] INCOMING FRAME: ${event.payload.toString().substring(0, 100)}`);
                });

                ws.on('socketerror', err => console.error(`[WS] Error: ${err}`));
                ws.on('close', () => console.log(`[WS] Closed: ${url}`));
            });

            // 3. Navigate
            await page.goto(app.url);
            try {
                await page.waitForLoadState('networkidle', { timeout: 5000 });
            } catch (e) {
                console.log(`[${app.name}] Timeout waiting for networkidle (busy WS?)`);
            }

            // 4. Dump Cookies & LocalStorage
            const cookies = await context.cookies();
            const sbCookie = cookies.find(c => c.name.includes('sb-'));

            console.log(`[${app.name}] Cookies Dump:`);
            if (sbCookie) {
                console.log(`  Name: ${sbCookie.name}`);
                console.log(`  Value (Snippet): ${sbCookie.value.substring(0, 50)}...`);
            } else {
                console.log('  No Supabase cookies found.');
            }

            const localStorageDump = await page.evaluate(() => {
                const items: Record<string, string> = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.includes('sb-')) items[key] = localStorage.getItem(key) || 'null';
                }
                return items;
            });
            console.log(`[${app.name}] LocalStorage Dump:`, localStorageDump);

            // 5. Force Reconnect Test (Reload)
            console.log(`[${app.name}] Reloading...`);
            await page.reload();
            await page.waitForTimeout(2000); // Wait for WS

            if (wsRequests.length === 0) {
                console.log(`[${app.name}] WARNING: No Realtime WebSocket connection detected.`);
            }
        });
    }
});
