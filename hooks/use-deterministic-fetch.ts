"use client"

import { useState, useCallback, useRef } from "react"
import { toast } from "sonner"
import { logError } from "@/lib/utils"

export type FetchStatus = "idle" | "loading" | "success" | "empty" | "error"

interface UseDeterministicFetchOptions<T> {
  fn: () => Promise<T[] | null>
  timeoutMs?: number
  onSuccess?: (data: T[]) => void
  onError?: (error: Error) => void
  initialData?: T[]
}

export function useDeterministicFetch<T>({
  fn,
  timeoutMs = 10000,
  onSuccess,
  onError,
  initialData = [],
}: UseDeterministicFetchOptions<T>) {
  const [data, setData] = useState<T[]>(initialData)
  const [status, setStatus] = useState<FetchStatus>("idle")
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const execute = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setStatus("loading")
    setError(null)

    try {
      const fetchPromise = async () => {
        const result = await fn()
        return result
      }

      // Race against timeout
      const result = await Promise.race([
        fetchPromise(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Request timed out")), timeoutMs)
        )
      ]) as T[] | null

      if (result == null) {
        throw new Error("Request returned no data")
      }

      const safeData = result
      setData(safeData)
      
      if (safeData.length === 0) {
        setStatus("empty")
      } else {
        setStatus("success")
      }
      
      onSuccess?.(safeData)
    } catch (err: any) {
      if (err.name === 'AbortError') return

      logError("DeterministicFetch", err)
      const errorObj = err instanceof Error ? err : new Error(String(err))
      setError(errorObj)
      setStatus("error")
      onError?.(errorObj)
      
      toast.error("Failed to load data", {
        description: errorObj.message
      })
    }
  }, [fn, timeoutMs, onSuccess, onError])

  return {
    data,
    status,
    error,
    retry: execute,
    isLoading: status === "loading",
    isEmpty: status === "empty",
    isError: status === "error",
    setData, // Allow manual updates (e.g. for realtime)
  }
}
