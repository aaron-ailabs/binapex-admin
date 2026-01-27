
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'node:path';

// Load env from trader app
dotenv.config({ path: path.resolve('c:/Users/user/Documents/workspace/binapex-trader/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

test.describe('Security Audit - Phase 3: Cheating Check (RLS)', () => {

    test('Traders cannot access Admin or Other User data via API', async () => {
        const traderClient = createClient(supabaseUrl, supabaseKey);

        // 1. Attempt to read admin_users (Should be denied by RLS)
        console.log('Auditing: admin_users access (Anonymous/Trader)');
        const { data: adminUsers, error: adminErr } = await traderClient
            .from('admin_users')
            .select('*');

        // Expected: error or empty data (if RLS is active)
        if (adminErr) {
            console.log('SUCCESS: admin_users access DENIED by RLS:', adminErr.message);
        } else if (adminUsers && adminUsers.length > 0) {
            console.error('CRITICAL BUG: Anonymous/Trader can read admin_users table!');
            throw new Error('RLS Violation: admin_users leaked');
        } else {
            console.log('SUCCESS: admin_users returned empty (RLS working)');
        }

        // 2. Attempt to read other user wallets
        console.log('Auditing: other user wallets access');
        const { data: otherWallets, error: walletErr } = await traderClient
            .from('wallets')
            .select('*');

        // Even if we see our own, we shouldn't see others
        // (This test is simple since we aren't logged in, it's an 'anon' check)
        if (otherWallets && otherWallets.length > 0) {
            console.error('CRITICAL BUG: Anonymous user can read wallets!');
            throw new Error('RLS Violation: wallets leaked');
        }

        console.log('Phase 3 Baseline RLS Audit PASSED');
    });
});
