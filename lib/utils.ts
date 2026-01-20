import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function logError(context: string, error: unknown) {
  try {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[${context}] Error: ${message}`, {
      timestamp: new Date().toISOString(),
      error,
    })
  } catch {
  }
}

export function logInfo(context: string, message: string, data?: unknown) {
  try {
    console.log(`[${context}] ${message}`, {
      timestamp: new Date().toISOString(),
      data,
    })
  } catch {
  }
}
