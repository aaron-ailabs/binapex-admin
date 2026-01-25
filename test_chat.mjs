import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testChat() {
  console.log('--- Testing Support Chat System ---');

  // 1. Check existing messages
  const { data: messages, error: readError } = await supabase
    .from('support_messages')
    .select('*')
    .limit(5);
  
  if (readError) {
    console.error('❌ Read Error:', readError.message);
  } else {
    console.log(`Found ${messages.length} messages.`);
    messages.forEach(m => console.log(`- From: ${m.sender_role}, Content: ${m.content.substring(0, 20)}...`));
  }

  // 2. Try to insert a test message as admin
  const adminId = 'c2b8545e-f8ec-4a63-acb7-b35fc2bb7dcf'; // From previous check
  const testMessage = {
    user_id: adminId, // Usually support messages are associated with a user_id (the trader)
    sender_role: 'admin',
    content: 'System Audit Test Message ' + new Date().toISOString()
  };

  console.log('\nInserting test message as admin...');
  const { data: inserted, error: insertError } = await supabase
    .from('support_messages')
    .insert([testMessage])
    .select();

  if (insertError) {
    console.error('❌ Insert Error:', insertError.message);
  } else {
    console.log('✅ Insert Success:', inserted[0].id);
  }

  // 3. Check for 'admin_users' again
  const { data: adminUsers, error: auError } = await supabase.from('admin_users').select('*').limit(1);
  if (auError) {
    console.log('❌ admin_users table check:', auError.message);
  } else {
    console.log('✅ admin_users table exists and is accessible.');
  }
}

testChat();
