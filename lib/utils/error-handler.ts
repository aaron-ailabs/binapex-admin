import * as Sentry from "@sentry/nextjs"

export interface ErrorContext {
  userId?: string
  endpoint?: string
  action?: string
  metadata?: Record<string, any>
}

export interface ServiceResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export function captureApiError(error: unknown, context: ErrorContext): void {
  const errorMessage = error instanceof Error ? error.message : String(error)

  Sentry.captureException(error, {
    level: "error",
    contexts: {
      api: {
        endpoint: context.endpoint,
        action: context.action,
      },
      user: context.userId ? { id: context.userId } : undefined,
    },
    extra: context.metadata,
  })

  console.error(`[v0] ${context.action || "API"} error:`, errorMessage, context.metadata)
}

export function captureBusinessLogicError(message: string, context: ErrorContext): void {
  Sentry.captureMessage(message, {
    level: "warning",
    contexts: {
      business: {
        action: context.action,
        endpoint: context.endpoint,
      },
    },
    extra: context.metadata,
  })

  console.warn(`[v0] Business logic error:`, message, context.metadata)
}

export function handleSupabaseError(error: any, action: string): ServiceResponse {
  // Capture in Sentry/Console
  captureApiError(error, { action })

  return {
    success: false,
    error: error.message || "A database error occurred",
    code: error.code,
  }
}
