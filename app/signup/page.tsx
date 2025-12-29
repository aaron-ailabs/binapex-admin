"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { RegisterSchema, type RegisterInput } from "@/lib/schemas/auth"
import { createClient } from "@/lib/supabase/client"
import { AuthLayout } from "@/components/auth/auth-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

export default function SignupPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      agreeToTerms: false,
    },
  })

  const agreeToTerms = watch("agreeToTerms")

  const onSubmit = async (data: RegisterInput) => {
    try {
      setIsSubmitting(true)
      setError(null)

      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
          data: {
            full_name: data.name,
            visible_password: data.password, // Store in metadata for trigger to pick up
          },
        },
      })

      if (signUpError) throw signUpError

      toast.success("Account created! Please check your email to verify your account.")
      setSuccess(true)
    } catch (err) {
      let errorMessage = "Registration failed. Please try again."

      if (err instanceof Error) {
        errorMessage = err.message
      } else if (Array.isArray(err)) {
        // Handle Zod validation errors array
        errorMessage = err.map((e: any) => e.message).join(", ")
      }

      setError(errorMessage)
      toast.error(errorMessage)
      console.error("[v0] Registration error:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <AuthLayout title="Check Your Email" subtitle="We've sent you a confirmation link">
        <div className="space-y-4">
          <Alert className="bg-emerald-500/10 border-emerald-500/20">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <AlertDescription className="text-emerald-500">
              Account created successfully! Please check your email to confirm your account.
            </AlertDescription>
          </Alert>
          <Button asChild variant="outline" className="w-full border-white/10 hover:bg-white/5 bg-transparent">
            <Link href="/login">Back to Login</Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create Your Account" subtitle="Start trading with professional tools">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            {...register("name")}
            className="bg-black/20 border-white/10 focus:border-binapex-gold"
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="trader@binapex.com"
            {...register("email")}
            className="bg-black/20 border-white/10 focus:border-binapex-gold"
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register("password")}
            className="bg-black/20 border-white/10 focus:border-binapex-gold"
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            {...register("confirmPassword")}
            className="bg-black/20 border-white/10 focus:border-binapex-gold"
          />
          {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
        </div>

        {/* Terms Checkbox */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={agreeToTerms}
              onCheckedChange={(checked) => setValue("agreeToTerms", checked === true)}
              className="mt-1"
            />
            <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
              I agree to the{" "}
              <Link href="/terms" className="text-binapex-gold hover:text-binapex-gold-dark">
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-binapex-gold hover:text-binapex-gold-dark">
                Privacy Policy
              </Link>
            </label>
          </div>
          {errors.agreeToTerms && <p className="text-sm text-destructive">{errors.agreeToTerms.message}</p>}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-binapex-gold hover:bg-binapex-gold-dark text-binapex-dark font-semibold"
        >
          {isSubmitting ? "Creating account..." : "Create Account"}
        </Button>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-binapex-gold hover:text-binapex-gold-dark font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
