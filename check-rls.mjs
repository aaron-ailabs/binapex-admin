
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRLS() {
  const { data, error } = await supabase
    .rpc('get_policies', { table_name: 'assets' })

  if (error) {
    // Fallback to direct query if RPC doesn't exist
    const { data: policies, error: polError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'assets')
    
    if (polError) {
       // Try querying pg_catalog directly
       const { data: pgData, error: pgError } = await supabase.from('pg_policy').select('*');
       console.log('Error checking policies, maybe no access to pg_policies. Trying another way...');
       
       // Just check if we can read assets with anon key vs service key
       const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
       const { data: anonAssets, error: anonError } = await anonClient.from('assets').select('id').limit(1);
       console.log('Can read assets with ANON key?', !anonError);
       if (anonError) console.log('Anon error:', anonError.message);

       const { data: serviceAssets, error: serviceError } = await supabase.from('assets').select('id').limit(1);
       console.log('Can read assets with SERVICE key?', !serviceError);
       if (serviceError) console.log('Service error:', serviceError.message);
    } else {
      console.log('Policies for assets table:', policies)
    }
  } else {
    console.log('Policies for assets table:', data)
  }
}

checkRLS()
