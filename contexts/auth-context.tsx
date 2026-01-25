"use client"

import type React from "react"
import { createContext, useContext, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface User {
  id: string
  email: string
  role: "admin" | "trader"
}

interface AuthContextType {
  isAuthenticated: boolean
  user: User | null
  isAdmin: boolean
  isLoading: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const roleCache = new Map<string, { role: string; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const initializeRef = useRef(false)

  useEffect(() => {
    if (initializeRef.current) return
    initializeRef.current = true

    const controller = new AbortController()

    const initializeAuth = async () => {
      console.log("[AuthContext] Initializing authentication...")
      const supabase = createClient()

      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (authUser) {
          console.log("[AuthContext] User found:", authUser.email)
          const cached = roleCache.get(authUser.id)
          if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log("[AuthContext] Using cached role:", cached.role)
            setUser({
              id: authUser.id,
              email: authUser.email || "",
              role: cached.role as "admin" | "trader",
            })
            setIsAuthenticated(true)
            setIsLoading(false)
            return
          }

          console.log("[AuthContext] Fetching role from RPC...")
          const { data: role, error } = await supabase.rpc("get_user_role")

          if (!error && role) {
            console.log("[AuthContext] Role fetched:", role)
            roleCache.set(authUser.id, { role, timestamp: Date.now() })
            setUser({
              id: authUser.id,
              email: authUser.email || "",
              role: role as "admin" | "trader",
            })
            setIsAuthenticated(true)
          } else {
            console.warn("[AuthContext] RPC error or no role, falling back to trader:", error?.message)
            // Fallback to trader role if RPC fails
            setUser({
              id: authUser.id,
              email: authUser.email || "",
              role: "trader",
            })
            setIsAuthenticated(true)
          }
        } else {
          console.log("[AuthContext] No user session found")
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("[AuthContext] Auth initialization error:", error)
        }
      } finally {
        console.log("[AuthContext] Initialization complete")
        setIsLoading(false)
      }
    }

    initializeAuth()

    let debounceTimer: NodeJS.Timeout
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthContext] Auth state changed:", event)
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(async () => {
        if (session?.user) {
          console.log("[AuthContext] Session user:", session.user.email)
          const cached = roleCache.get(session.user.id)
          if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log("[AuthContext] Using cached role on state change:", cached.role)
            setUser({
              id: session.user.id,
              email: session.user.email || "",
              role: cached.role as "admin" | "trader",
            })
            setIsAuthenticated(true)
          } else {
            console.log("[AuthContext] Fetching role on state change...")
            const { data: role, error } = await supabase.rpc("get_user_role")

            const userRole = !error && role ? role : "trader"
            console.log("[AuthContext] Role on state change:", userRole)
            roleCache.set(session.user.id, { role: userRole, timestamp: Date.now() })
            setUser({
              id: session.user.id,
              email: session.user.email || "",
              role: userRole as "admin" | "trader",
            })
            setIsAuthenticated(true)
          }
        } else {
          console.log("[AuthContext] User signed out")
          setUser(null)
          setIsAuthenticated(false)
        }
      }, 300) // 300ms debounce
    })

    return () => {
      clearTimeout(debounceTimer)
      subscription?.unsubscribe()
      controller.abort()
    }
  }, [])

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setIsAuthenticated(false)
    if (user) {
      roleCache.delete(user.id)
    }
    router.push("/admin/login")
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isAdmin: user?.role === "admin",
        isLoading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
