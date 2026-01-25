
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectTable() {
  const { data, error } = await supabase
    .rpc('get_table_columns', { table_name: 'assets' })

  if (error) {
    // If RPC doesn't exist, try querying information_schema
    const { data: columns, error: colError } = await supabase
      .from('assets')
      .select('*')
      .limit(1)
    
    if (colError) {
      console.error('Error fetching columns:', colError)
      return
    }
    
    if (columns && columns.length > 0) {
      console.log('Columns in assets table:', Object.keys(columns[0]))
    } else {
      console.log('No data in assets table to infer columns.')
    }
  } else {
    console.log('Columns in assets table:', data)
  }
}

inspectTable()
