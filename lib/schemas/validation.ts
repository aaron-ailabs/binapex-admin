/**
 * Centralized Validation Schemas
 * SEC-FIX: Input validation for all admin operations
 */

import { z } from "zod"

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid("Invalid UUID format")

/**
 * Password validation schema
 * SEC-FIX: Strong password requirements
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")

/**
 * Withdrawal password validation (can be slightly more lenient for legacy support)
 */
export const withdrawalPasswordSchema = z
  .string()
  .min(8, "Withdrawal password must be at least 8 characters")
  .max(128, "Withdrawal password must not exceed 128 characters")

/**
 * Email validation schema
 */
export const emailSchema = z.string().email("Invalid email address")

/**
 * Amount validation schema (financial transactions)
 */
export const amountSchema = z
  .number()
  .positive("Amount must be positive")
  .finite("Amount must be a finite number")
  .max(10000000, "Amount exceeds maximum allowed value")

/**
 * Credit score validation
 */
export const creditScoreSchema = z.object({
  userId: uuidSchema,
  score: z.number().int().min(0, "Score must be at least 0").max(100, "Score must not exceed 100"),
  reason: z.string().min(1, "Reason is required").max(500, "Reason too long"),
})

/**
 * Exchange rate validation
 */
export const exchangeRateSchema = z.object({
  rate: z.number().positive("Rate must be positive").finite("Rate must be a finite number"),
})

/**
 * Ban duration validation
 */
export const banDurationSchema = z.object({
  userId: uuidSchema,
  durationHours: z.number().int().positive("Duration must be positive").max(8760, "Duration cannot exceed 1 year"), // max 365 days
  reason: z.string().min(1, "Reason is required").max(500, "Reason too long"),
})

/**
 * Withdrawal approval validation
 */
export const withdrawalApprovalSchema = z.object({
  transactionId: uuidSchema,
  adminNote: z.string().optional(),
})

/**
 * Withdrawal rejection validation
 */
export const withdrawalRejectionSchema = z.object({
  transactionId: uuidSchema,
  reason: z.string().min(1, "Rejection reason is required").max(500, "Reason too long"),
})

/**
 * User update validation
 */
export const userUpdateSchema = z.object({
  userId: uuidSchema,
  fullName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  tier: z.enum(["silver", "gold", "platinum", "diamond"]).optional(),
  email: emailSchema.optional(),
})

/**
 * Generic error response schema
 */
export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

/**
 * Generic success response schema
 */
export const successResponseSchema = z.object({
  success: z.literal(true),
  data: z.any().optional(),
})

/**
 * Sanitize error messages for client responses
 * SEC-FIX: Don't expose internal error details to clients
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.errors[0]?.message || "Validation failed"
  }

  if (error instanceof Error) {
    // Don't expose database errors, auth errors, or internal errors
    if (
      error.message.includes("violates") ||
      error.message.includes("constraint") ||
      error.message.includes("duplicate") ||
      error.message.toLowerCase().includes("unauthorized") ||
      error.message.toLowerCase().includes("forbidden")
    ) {
      return "Operation failed. Please check your input and try again."
    }

    return error.message
  }

  return "An unexpected error occurred"
}

/**
 * Validate and sanitize IP address
 * SEC-FIX: Prevent IP spoofing in audit logs
 */
export function sanitizeIpAddress(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for")
  const realIp = headers.get("x-real-ip")
  const cfConnectingIp = headers.get("cf-connecting-ip") // Cloudflare
  const trueClientIp = headers.get("true-client-ip") // Cloudflare

  // Prefer Cloudflare headers if available (more trustworthy)
  const ip = cfConnectingIp || trueClientIp || forwardedFor?.split(",")[0]?.trim() || realIp || "unknown"

  // Basic validation: IPv4 or IPv6
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/

  if (ip === "unknown" || ipv4Regex.test(ip) || ipv6Regex.test(ip)) {
    return ip
  }

  // If validation fails, return unknown
  return "unknown"
}
