import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function validate() {
  const { data: order, error } = await supabase.from('orders').select('*').limit(1)
  if (order && order.length > 0) {
    console.log('Order columns:', Object.keys(order[0]))
  } else {
    console.log('No orders found to inspect columns.')
  }
}

validate()
