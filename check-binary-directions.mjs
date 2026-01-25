
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkBinaryDirections() {
  const { data, error } = await supabase
    .from('orders')
    .select('direction, type, status')
    .eq('type', 'binary')
    .limit(10)

  if (error) {
    console.error('Error fetching orders:', error)
  } else {
    console.log('Sample binary orders:', data)
  }
}

checkBinaryDirections()
