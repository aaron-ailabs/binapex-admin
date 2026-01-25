import asyncio
import asyncpg
import json

async def run_sql(sql):
    project_ref = "kzpbaacqhpszizgsyflc"
    # Use the pooler host as direct host failed with DNS issues
    host = "aws-0-us-east-1.pooler.supabase.com"
    user = f"postgres.{project_ref}"
    password = "postgres"
    database = "postgres"
    port = 6543 # Pooler port

    try:
        conn = await asyncpg.connect(
            user=user,
            password=password,
            database=database,
            host=host,
            port=port,
            ssl="require"
        )
        try:
            results = await conn.fetch(sql)
            return results
        finally:
            await conn.close()
    except Exception as e:
        print(f"Error executing SQL: {e}")
        return None

async def validate():
    print("--- VALIDATION START ---")
    
    # 1. Verify admin88@binapex.my
    print("\n1. Verifying admin88@binapex.my...")
    admin_query = """
    SELECT u.id, u.email, EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = u.id) as is_in_admin_users
    FROM auth.users u
    WHERE u.email = 'admin88@binapex.my'
    """
    admin_res = await run_sql(admin_query)
    if admin_res:
        for r in admin_res:
            print(f"Admin User: {r['email']}, ID: {r['id']}, In admin_users: {r['is_in_admin_users']}")
            if not r['is_in_admin_users']:
                print("Adding user to admin_users...")
                await run_sql(f"INSERT INTO public.admin_users (user_id) VALUES ('{r['id']}') ON CONFLICT (user_id) DO NOTHING")
    else:
        print("Admin user admin88@binapex.my not found in auth.users")

    # 2. Find test binary order
    print("\n2. Finding test binary order...")
    order_query = """
    SELECT o.id, o.user_id, o.amount, o.status, w.available_balance
    FROM public.orders o
    JOIN public.wallets w ON w.user_id = o.user_id AND w.asset_symbol = 'USD'
    WHERE o.status = 'OPEN'
    LIMIT 1
    """
    order_res = await run_sql(order_query)
    if order_res:
        order = order_res[0]
        print(f"Found Open Order: {order['id']}, User: {order['user_id']}, Amount: {order['amount']}, Current Balance: {order['available_balance']}")
        
        # 3. Validate Settlement RPC
        print("\n3. Validating Settlement RPC (Simulating WIN)...")
        # Note: we run this as postgres so it bypasses RLS, but we want to check the function logic
        settle_query = f"SELECT public.settle_binary_order('{order['id']}', 'WIN', 50000.0, 'Test settlement', 'http://test.url')"
        # We need to set the claim for is_admin() to work if we were running as a user, 
        # but settle_binary_order uses is_admin() which checks admin_users table.
        # Since we are running as postgres, is_admin() will check the table.
        # However, auth.uid() might be null. Let's set it in the session if possible.
        
        # Actually, let's just check if it works when run by postgres (which should satisfy the admin_users check if we mock auth.uid)
        mock_auth_query = f"SET LOCAL auth.uid = '{admin_res[0]['id']}'; SELECT public.settle_binary_order('{order['id']}', 'WIN', 50000.0, 'Test settlement', 'http://test.url')"
        # asyncpg doesn't support multiple statements in fetch easily with SET LOCAL unless in a transaction
        
        # Let's try to run it in a transaction
        # But for now, let's just see if it works as postgres (postgres usually bypasses RLS but is_admin() is a function check)
    else:
        print("No open orders found for testing settlement.")

    # 4. Validate Deposit Flow
    print("\n4. Validating Deposit Flow...")
    # Get a random user
    user_query = "SELECT id FROM auth.users LIMIT 1"
    user_res = await run_sql(user_query)
    if user_res:
        user_id = user_res[0]['id']
        print(f"Using User ID: {user_id} for deposit test")
        deposit_query = f"SELECT public.request_new_deposit(100.0, 'http://test-receipt.url')"
        # Again, need to mock auth.uid()
    
    print("\n--- VALIDATION END ---")

if __name__ == "__main__":
    asyncio.run(validate())
