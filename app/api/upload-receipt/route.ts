import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { rateLimitMiddleware } from "@/lib/middleware/rate-limit"

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = rateLimitMiddleware(request, 10, 60000)
    if (rateLimitResponse) return rateLimitResponse

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, and PDF files are allowed" }, { status: 400 })
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 })
    }

    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${timestamp}.${fileExt}`

    // Upload to Supabase Storage 'deposit-receipts' bucket
    const { data, error } = await supabase.storage
      .from('deposit-receipts')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error("Supabase storage error:", error)
      return NextResponse.json({ error: "Storage upload failed: " + error.message }, { status: 500 })
    }

    // Get public URL (assuming bucket is public OR we use this path to store)
    const { data: { publicUrl } } = supabase.storage
      .from('deposit-receipts')
      .getPublicUrl(fileName)

    return NextResponse.json({
      url: publicUrl, 
      path: data.path,
      filename: file.name,
      size: file.size,
      type: file.type,
    })

  } catch (error: any) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 })
  }
}
