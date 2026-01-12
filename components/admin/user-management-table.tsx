"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, ExternalLink } from "lucide-react"
import { useState } from "react"
import { format } from "date-fns"
import Link from "next/link"
import { useLiveData } from "@/hooks/use-live-data"
import { AdminUser } from "@/lib/types/admin"

interface UserManagementTableProps {
  users: AdminUser[]
}

export function UserManagementTable({ users: initialUsers }: UserManagementTableProps) {
  // const users = useLiveData<AdminUser>("profiles", initialUsers, { column: "created_at", ascending: false }) 
  // Disable LiveData to ensure consistency with Server Action data.
  const users = initialUsers
  const [searchQuery, setSearchQuery] = useState("")

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "silver":
        return "bg-muted/50 text-muted-foreground border-border"
      case "gold":
        return "bg-primary/10 text-primary border-primary/20"
      case "platinum":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20"
      case "diamond":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20"
      default:
        return "bg-muted/50 text-muted-foreground border-border"
    }
  }


  const getCreditScoreBadge = (creditScore: number) => {
    if (creditScore >= 80) {
      return { color: "bg-success/10 text-success border-success/20", text: "Excellent" }
    } else if (creditScore >= 70) {
      return { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", text: "Good" }
    } else if (creditScore >= 60) {
      return { color: "bg-primary/10 text-primary border-primary/20", text: "Average" }
    } else {
      return { color: "bg-destructive/10 text-destructive border-destructive/20", text: "Poor" }
    }
  }

  const isBanned = (user: AdminUser) => user.banned_until && new Date(user.banned_until) > new Date()

  return (
    <GlassCard className="p-4 md:p-6">
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
                    User
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Balance
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Tier
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Last Login
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-foreground whitespace-nowrap">
                          {user.full_name || "No Name"}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        {user.role === "admin" && (
                          <Badge
                            variant="outline"
                            className="mt-1 bg-destructive/10 text-destructive border-destructive/20 text-xs"
                          >
                            Admin
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-mono text-foreground whitespace-nowrap">
                          ${Number(user.balance_usd).toFixed(2)}
                        </p>
                        {user.bonus_balance > 0 && (
                          <p className="text-xs text-primary font-mono whitespace-nowrap">
                            +${Number(user.bonus_balance).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {isBanned(user) ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : user.kyc_verified ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">Unverified</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className={getTierColor(user.membership_tier)}>
                        {user.membership_tier}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-center">
                      {user.last_sign_in_at ? format(new Date(user.last_sign_in_at), "MMM d, HH:mm") : "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/admin/users/${user.id}`}>
                        <Button variant="ghost" size="sm" className="hover:text-primary">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No users found</p>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
