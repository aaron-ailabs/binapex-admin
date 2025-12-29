"use server"

import { createClient } from "@/lib/supabase/server"
import { headers } from "next/headers"

interface GeoResponse {
    status: string
    country: string
    countryCode: string
    region: string
    regionName: string
    city: string
    zip: string
    lat: number
    lon: number
    timezone: string
    isp: string
    org: string
    as: string
    query: string
}

export async function updateUserLocation() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    try {
        const headersList = await headers()

        // Get IP from headers (standard Vercel/proxy headers)
        let ip = headersList.get("x-forwarded-for")?.split(",")[0] ||
            headersList.get("x-real-ip") ||
            "";

        // For local development, ignore localhost
        if (process.env.NODE_ENV === "development" && (ip === "::1" || ip === "127.0.0.1" || !ip)) {
            // Optional: Use a dummy IP for testing logic if needed, or just return
            console.log("Dev environment: Skipping Geo update for localhost")
            return
        }

        if (!ip) return

        // Check if we already have this IP logged to avoid API spam
        const { data: profile } = await supabase
            .from("profiles")
            .select("last_ip")
            .eq("id", user.id)
            .single()

        if (profile?.last_ip === ip) {
            // IP hasn't changed, no need to re-fetch location
            return
        }

        // IP changed, fetch new location
        // Using ip-api.com (free, 45 requests/minute limit) - sufficient for MVP
        // In production, consider a paid service or one with higher limits/SLA
        const response = await fetch(`http://ip-api.com/json/${ip}`)

        if (!response.ok) {
            throw new Error("Failed to fetch location data")
        }

        const geoData: GeoResponse = await response.json()

        if (geoData.status !== "success") {
            // If API fails (e.g. private IP), still update the IP but leave location blank?
            // Or just log the IP. Let's log the IP at least.
            await supabase.from("profiles").update({
                last_ip: ip
            }).eq("id", user.id)
            return
        }

        // Update Profile
        await supabase.from("profiles").update({
            last_ip: ip,
            city: geoData.city,
            region: geoData.country, // user-detail-view shows "Region" but data might be Country or RegionName. 
            // Let's use Country for "Region" as it's more useful for "Region" in some contexts, 
            // or regionName. The UI says "Region", let's put "City, CountryCode" or just Country.
            // let's stick to simple mapping: city -> city, region -> regionName
            // Actually the specific requested fields were "City" and "Region".
            // Let's ensure the DB columns 'city' and 'region' exist (checked in migration script).
        }).eq("id", user.id)

        // If you want to be more specific:
        // city = geoData.city
        // region = geoData.regionName + ", " + geoData.countryCode

        // Refinement based on typical usage:
        await supabase.from("profiles").update({
            last_ip: ip,
            city: geoData.city,
            region: `${geoData.regionName}, ${geoData.countryCode}`
        }).eq("id", user.id)

    } catch (error) {
        console.error("Geo update error:", error)
    }
}
