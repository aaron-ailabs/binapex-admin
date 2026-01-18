// app/api/admin/users/route.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch { }
        }
      }
    }
  );

  // Check auth (middleware should have already done this, but redundant check)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Get query params
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');
  const search = searchParams.get('search') || null;

  try {
    // Call RPC function (all auth checks happen there too)
    const { data, error } = await supabase.rpc('admin_list_users', {
      page_num: page,
      page_size: pageSize,
      search_email: search,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // data is array of users with total_count in each row (or need to extract)
    // The RPC returns { ..., total_count } for each row.

    const count = data?.[0]?.total_count || 0;

    return NextResponse.json({
      users: data || [],
      pagination: {
        page,
        pageSize,
        total: count,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
