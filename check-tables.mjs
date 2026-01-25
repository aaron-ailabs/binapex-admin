import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const { data, error } = await supabase.rpc('get_tables');
  
  if (error) {
    // If get_tables RPC doesn't exist, try a simple query
    console.log('Error calling get_tables RPC, trying direct query...');
    const { data: tables, error: queryError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public');
    
    if (queryError) {
      console.error('Error fetching tables:', queryError);
      // Try another way - list columns from a known table to see if it works
      const { data: columns, error: colError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (colError) {
        console.error('Error fetching profiles:', colError);
      } else {
        console.log('Successfully fetched from profiles table.');
      }
    } else {
      console.log('Tables in public schema:', tables.map(t => t.tablename));
    }
  } else {
    console.log('Tables:', data);
  }
}

checkTables();
