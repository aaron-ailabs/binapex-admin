"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { User, Camera, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import type { Profile } from "@/lib/types/database"
import { useRouter } from "next/navigation"

interface AvatarUploadProps {
  userId: string
  avatarUrl: string | null
  fullName: string | null
}

export function AvatarUpload({ userId, avatarUrl, fullName }: AvatarUploadProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
      toast.error("Image size must be less than 2MB")
      return
    }

    setIsUploading(true)

    try {
      const fileExt = file.name.split(".").pop()
      const filePath = `${userId}/${Date.now()}.${fileExt}`

      // Upload to 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file)

      if (uploadError) {
         // Fallback: try creating bucket or assume it might not exist (common issue), but for now throw
         throw uploadError
      }

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath)

      // Update Profile
      const { error: dbError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId)

      if (dbError) throw dbError

      toast.success("Avatar updated successfully")
      router.refresh()
    } catch (error: any) {
      console.error("Avatar upload error:", error)
      toast.error(error.message || "Failed to upload avatar. Please try again.")
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
         fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-[#F59E0B]/50 bg-black/50 flex items-center justify-center relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="text-2xl font-bold text-gray-500">
                {fullName ? fullName.substring(0, 2).toUpperCase() : <User className="h-10 w-10" />}
            </div>
          )}
          
          {/* Overlay */}
          <div 
             className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
             onClick={() => fileInputRef.current?.click()}
          >
             <Camera className="h-8 w-8 text-white" />
          </div>
        </div>
        
        {isUploading && (
           <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-full z-10">
               <Loader2 className="h-8 w-8 animate-spin text-[#F59E0B]" />
           </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="text-xs border-white/10 hover:bg-white/5"
      >
        <Upload className="h-3 w-3 mr-2" />
        Change Avatar
      </Button>
    </div>
  )
}
