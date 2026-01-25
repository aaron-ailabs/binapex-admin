import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateAdmins() {
  console.log('--- Migrating Admins to admin_users table ---');
  
  // 1. Get admins from profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin');
    
  if (profileError) {
    console.error('Error fetching admins from profiles:', profileError.message);
    return;
  }
  
  console.log(`Found ${profiles.length} admins in profiles.`);
  
  if (profiles.length === 0) {
    console.log('No admins to migrate.');
    return;
  }
  
  // 2. Insert into admin_users
  const adminUsers = profiles.map(p => ({ user_id: p.id }));
  const { data: inserted, error: insertError } = await supabase
    .from('admin_users')
    .upsert(adminUsers, { onConflict: 'user_id' });
    
  if (insertError) {
    console.error('Error inserting into admin_users:', insertError.message);
  } else {
    console.log(`Successfully migrated ${profiles.length} admins to admin_users table.`);
  }
}

migrateAdmins();
