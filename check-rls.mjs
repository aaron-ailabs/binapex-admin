
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kzpbaacqhpszizgsyflc.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6cGJhYWNxaHBzeml6Z3N5ZmxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTU5Njc0NiwiZXhwIjoyMDgxMTcyNzQ2fQ.aYbDzEd2ucTOAX7vSMAMzYaHZiWMpToEp_Uk61wkDXc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRLS() {
  const tables = ['market_prices', 'wallets', 'support_messages', 'support_conversations'];
  
  for (const table of tables) {
    console.log(`\nChecking policies for ${table}...`);
    // Try RPC first
    const { data, error } = await supabase.rpc('get_policies', { table_name: table })

    if (error) {
      console.log(`RPC error for ${table}:`, error.message);
      // Fallback: Check if we can read with Service Role (should always be yes)
      const { error: serviceError } = await supabase.from(table).select('*').limit(1);
      console.log(`Service Role Read ${table}:`, serviceError ? `FAILED (${serviceError.message})` : 'SUCCESS');

      // Check if we can read with Anon (simulate public access)
      const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6cGJhYWNxaHBzeml6Z3N5ZmxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1OTY3NDYsImV4cCI6MjA4MTE3Mjc0Nn0.PDb3Sy81oDP6oED88ThPjFqEeGHwosIbToc3RPGhw94');
      const { error: anonError } = await anonClient.from(table).select('*').limit(1);
      console.log(`Anon Role Read ${table}:`, anonError ? `FAILED (${anonError.message})` : 'SUCCESS');
    } else {
      console.log(`Policies for ${table}:`, data)
    }
  }
}

checkRLS()
