
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLastUser() {
    console.log('Checking user_secrets (no sort)...');
    const { data: secrets, error: secretError } = await supabase
        .from('user_secrets')
        .select('*')
        .limit(5);

    if (secretError) console.log('Error fetching user_secrets:', secretError.message);
    else console.log('User Secrets (Any):', secrets);

    console.log('Checking auth.users (via admin API)...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 10 });
    if (authError) console.log('Error fetching auth users:', authError.message);
    else {
        // Sort by created_at desc manually
        const sortedUsers = users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        console.log('Latest Auth Users:', sortedUsers.slice(0, 5).map(u => ({ email: u.email, id: u.id, created_at: u.created_at })));
    }
}

checkLastUser();
