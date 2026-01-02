import { z } from "zod"
import { passwordSchema } from "@/lib/utils/password-validation"

export const LoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export const RegisterSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
    email: z.string().email("Please enter a valid email address"),
    password: passwordSchema,
    confirmPassword: z.string(),
    withdrawalPassword: passwordSchema,
    confirmWithdrawalPassword: z.string(),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the Terms & Conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.withdrawalPassword === data.confirmWithdrawalPassword, {
    message: "Withdrawal passwords do not match",
    path: ["confirmWithdrawalPassword"],
  })

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>
