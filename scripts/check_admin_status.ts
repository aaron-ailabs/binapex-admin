
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    const email = 'auditor_admin@binapex.com';
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;

    const user = data.users.find(u => u.email === email);
    if (!user) {
        console.log('User NOT found');
    } else {
        console.log('User found:', user.id);
        console.log('Role:', user.role);
        console.log('Email Confirmed At:', user.email_confirmed_at);
        console.log('Last Sign In:', user.last_sign_in_at);

        // Check Profile
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        console.log('Profile:', profile);

        // Confirm if needed
        if (!user.email_confirmed_at) {
            console.log('Confirming email...');
            const { error: confirmError } = await supabase.auth.admin.updateUserById(user.id, { email_confirm: true });
            if (confirmError) console.error(confirmError);
            else console.log('Email confirmed.');
        }
    }
}

main().catch(console.error);
