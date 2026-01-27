
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from("system_settings")
            .select("*")

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data)
    } catch (err) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { key, value } = await req.json()

        const { data: isAdmin } = await supabase.rpc("is_admin")
        if (!isAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

        const { error } = await supabase
            .from("system_settings")
            .upsert({ key, value, updated_at: new Date().toISOString() })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ success: true })
    } catch (err) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
