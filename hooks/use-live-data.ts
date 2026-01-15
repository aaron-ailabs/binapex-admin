"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

type SortOptions = {
  column?: string
  ascending?: boolean
}

function sortBy<T>(rows: T[], options?: SortOptions) {
  const column = options?.column
  if (!column) return rows

  const ascending = options?.ascending ?? true
  const copy = [...rows]

  copy.sort((a: any, b: any) => {
    const av = a?.[column]
    const bv = b?.[column]

    if (av == null && bv == null) return 0
    if (av == null) return ascending ? -1 : 1
    if (bv == null) return ascending ? 1 : -1

    if (typeof av === "number" && typeof bv === "number") {
      return ascending ? av - bv : bv - av
    }

    const as = String(av)
    const bs = String(bv)
    return ascending ? as.localeCompare(bs) : bs.localeCompare(as)
  })

  return copy
}

export function useLiveData<T extends { id?: string }>(
  table: string,
  initialRows: T[] = [],
  sortOptions?: SortOptions,
) {
  const [rows, setRows] = useState<T[]>(() => sortBy(initialRows, sortOptions))

  const initialSignature = useMemo(() => JSON.stringify(initialRows.map((r: any) => r?.id ?? "")), [initialRows])

  // SEC-FIX: Added sortOptions to dependency array to prevent stale sorting
  useEffect(() => {
    setRows(sortBy(initialRows, sortOptions))
  }, [initialSignature, sortOptions])

  useEffect(() => {
    const supabase = createClient()
    let channel: RealtimeChannel | null = null

    channel = supabase
      .channel(`live:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload: any) => {
          const event = payload.eventType
          const next = payload.new as T | null
          const old = payload.old as T | null

          setRows((prev) => {
            const prevList = [...prev]

            if (event === "INSERT" && next) {
              const exists = prevList.some((r: any) => r?.id && next && (r as any).id === (next as any).id)
              const merged = exists ? prevList : [next, ...prevList]
              return sortBy(merged, sortOptions)
            }

            if (event === "UPDATE" && next) {
              const updated = prevList.map((r: any) => ((r as any).id === (next as any).id ? next : r))
              return sortBy(updated, sortOptions)
            }

            if (event === "DELETE" && old) {
              const filtered = prevList.filter((r: any) => (r as any).id !== (old as any).id)
              return sortBy(filtered, sortOptions)
            }

            return prevList
          })
        },
      )
      .subscribe()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
    // SEC-FIX: Added sortOptions to dependency to update subscriptions when sort changes
  }, [table, sortOptions])

  return rows
}
