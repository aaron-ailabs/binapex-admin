"use client"

import { useEffect } from "react"
import { updateUserLocation } from "@/app/actions/geo"

export function GeoUpdater() {
    useEffect(() => {
        // Fire and forget - silent update
        // We don't await this because we don't want to block the UI or show loading states
        // for a background tracking task.
        updateUserLocation().catch(err => {
            // Silently fail in production, maybe log to monitoring
            console.error("BG Geo Update failed", err)
        })
    }, [])

    return null // Render nothing
}
