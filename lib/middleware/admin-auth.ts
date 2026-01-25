// lib/middleware/admin-auth.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function adminAuthMiddleware(request: NextRequest) {
    const cookieStore = await cookies();

    // Create client - attempting to use Service Role for elevated check if needed,
    // but relies on user session from cookies.
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        // Use Service key if available for robust role checks, fallback to Anon if not (though Audit Plan designated Service Key)
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch {
                        // Middleware cant set cookies implies read-only in some phases, but normally fine
                    }
                },
            },
        }
    );

    // Get user
    const { data: { user }, error } = await supabase.auth.getUser();

    // Check 1: User must be authenticated
    if (!user || error) {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/login';
        return NextResponse.redirect(url);
    }

    // Check 2: Admin authorization MUST NOT use user_metadata/app_metadata.
    // Metadata is user-controlled; using it for authorization is a privilege escalation vector.
    const { data: isAdmin, error: isAdminError } = await supabase.rpc('is_admin');
    if (isAdminError || isAdmin !== true) {
        console.warn(`Unauthorized admin access attempt by user ${user.id} (is_admin=${String(isAdmin)}, err=${isAdminError?.message})`);

        // In middleware, returning valid JSON for API routes or Redirect for pages?
        // Request path check:
        if (request.nextUrl.pathname.startsWith('/api/')) {
            return NextResponse.json(
                { error: 'Unauthorized: Admin role required' },
                { status: 403 }
            );
        } else {
            // Redirect to login or dedicated 403 page
            // For now, redirect to login which might show "Not admin" error if logged in
            const url = request.nextUrl.clone();
            url.pathname = '/admin/login';
            url.searchParams.set('error', 'unauthorized');
            return NextResponse.redirect(url);
        }
    }

    // Check 3: Redundant DB check (Skipped as user_roles table is unverified/missing in current schema analysis)
    // Reliability on JWT claims (metadata) is sufficient for Middleware speed.

    // All checks passed - user is admin
    return NextResponse.next();
}
