
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function main() {
    const email = 'auditor_admin@binapex.com';
    const password = 'Password123!';

    console.log(`Creating/Updating admin: ${email}`);

    // 1. Create or Update User by Email
    // admin.createUser will return error if exists. listing is better or just try create.
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    let userId = listData.users.find(u => u.email === email)?.id;

    if (!userId) {
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'admin' } // Attempt to set metadata, but profile trigger is main source
        });
        if (error) throw error;
        userId = data.user.id;
        console.log('User created:', userId);
    } else {
        // Audit: Reset password just in case
        const { error } = await supabase.auth.admin.updateUserById(userId, { password });
        if (error) throw error;
        console.log('User password reset:', userId);
    }

    // 2. Ensure Role is Admin in public.profiles (if trigger exists or manual update needed)
    console.log('Updating public.profiles role...');
    const { error: dbError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', userId);

    if (dbError) {
        console.error('Error updating profile role:', dbError);
    } else {
        console.log('Profile role set to admin.');
    }
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
