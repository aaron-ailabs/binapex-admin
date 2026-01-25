import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

async function testRealtime() {
  console.log('--- Testing Realtime Subscription ---');
  
  const channel = supabase.channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
      console.log('Change received on orders:', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, (payload) => {
      console.log('Change received on support_messages:', payload);
    })
    .subscribe((status) => {
      console.log('Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to Realtime!');
        // Keep it open for a bit to see if we get anything, or just close if we only wanted to test connection
        setTimeout(() => {
          console.log('Closing test...');
          supabase.removeChannel(channel);
          process.exit(0);
        }, 5000);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime subscription failed.');
        process.exit(1);
      }
    });
}

testRealtime();
